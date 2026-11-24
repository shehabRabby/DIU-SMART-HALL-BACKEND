"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisciplineService = void 0;
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const enums_1 = require("../../../generated/prisma/enums");
const config_1 = __importDefault(require("../../config"));
const prisma_1 = require("../../lib/prisma");
const nodemailer_1 = require("../../lib/nodemailer");
/**
 * Helper: Resolve Student by UUID or studentUniId
 */
const findStudentByIdentifier = async (identifier) => {
    const student = await prisma_1.prisma.student.findFirst({
        where: {
            isDeleted: false,
            OR: [{ id: identifier }, { studentUniId: identifier }],
        },
        include: {
            hall: { select: { id: true, name: true, shortName: true } },
            room: { select: { id: true, roomNumber: true, floor: true } },
        },
    });
    if (!student) {
        throw new Error("Student not found with the given ID.");
    }
    return student;
};
/**
 * Helper: Good Conduct Redemption (Auto-Expire old ACTIVE warnings & sync warningCount)
 */
const syncExpiredWarnings = async (studentId) => {
    const now = new Date();
    const whereClause = {
        status: enums_1.WarningStatus.ACTIVE,
        expiresAt: {
            not: null,
            lte: now,
        },
        ...(studentId ? { studentId } : {}),
    };
    const expiredWarnings = await prisma_1.prisma.studentWarning.findMany({
        where: whereClause,
        select: { id: true, studentId: true },
    });
    if (expiredWarnings.length === 0)
        return;
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.studentWarning.updateMany({
            where: { id: { in: expiredWarnings.map((w) => w.id) } },
            data: { status: enums_1.WarningStatus.EXPIRED },
        });
        const affectedStudentIds = [
            ...new Set(expiredWarnings.map((w) => w.studentId)),
        ];
        for (const sId of affectedStudentIds) {
            const activeCount = await tx.studentWarning.count({
                where: {
                    studentId: sId,
                    status: enums_1.WarningStatus.ACTIVE,
                },
            });
            await tx.student.update({
                where: { id: sId },
                data: { warningCount: activeCount },
            });
        }
    });
};
/**
 * Helper: Render EJS Template & Send Disciplinary Email via Nodemailer Transporter
 */
const notifyStudentDisciplinaryAction = async (params) => {
    try {
        const templatePath = path_1.default.join(process.cwd(), "src/app/templates/discipline-notice.ejs");
        const html = await ejs_1.default.renderFile(templatePath, {
            subject: params.subject,
            noticeType: params.noticeType,
            headerClass: params.headerClass || "header-default",
            studentName: params.studentName,
            studentUniId: params.studentUniId || null,
            hallName: params.hallName || null,
            heading: params.heading,
            message: params.message,
            category: params.category || null,
            severity: params.severity || null,
            strikeNumber: params.strikeNumber || null,
            fineAmount: params.fineAmount || 0,
            appealDeadline: params.appealDeadline
                ? params.appealDeadline.toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                })
                : null,
            expiresAt: params.expiresAt
                ? params.expiresAt.toLocaleDateString("en-US", {
                    dateStyle: "medium",
                })
                : null,
        });
        await nodemailer_1.transporter.sendMail({
            from: `"DIU SmartHall Administration" <${config_1.default.smtp_user}>`,
            to: params.to,
            subject: params.subject,
            html,
        });
    }
    catch (error) {
        console.error("Failed to render/send disciplinary email:", error);
    }
};
/**
 * Core Engine: Issue Warning / Show-Cause & Handle 3-Strike Auto-Expulsion
 */
const executeIssueWarning = async (adminUserId, payload, incidentId) => {
    const student = await findStudentByIdentifier(payload.studentId);
    if (student.isExpelled) {
        throw new Error("This student is already expelled from hall residence.");
    }
    // Sync expired warnings first so strike calculation is accurate
    await syncExpiredWarnings(student.id);
    const currentActiveWarnings = await prisma_1.prisma.studentWarning.count({
        where: {
            studentId: student.id,
            status: enums_1.WarningStatus.ACTIVE,
        },
    });
    const isShowCause = Boolean(payload.issueAsShowCause && !payload.forceExpel);
    const nextStrikeNumber = Math.min(currentActiveWarnings + 1, 3);
    const appealHours = payload.appealHours ?? 72;
    const appealDeadline = new Date(Date.now() + appealHours * 60 * 60 * 1000);
    const expiryDays = payload.expiryDays ?? 180;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    const willExpel = !isShowCause && (nextStrikeNumber >= 3 || Boolean(payload.forceExpel));
    const category = payload.category ?? enums_1.IncidentCategory.DISCIPLINARY_BREACH;
    const severity = payload.severity ?? enums_1.WarningSeverity.MINOR;
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const warning = await tx.studentWarning.create({
            data: {
                studentId: student.id,
                hallId: student.hallId,
                incidentId: incidentId ?? null,
                issuedById: adminUserId,
                strikeNumber: nextStrikeNumber,
                category,
                severity,
                title: payload.title,
                reason: payload.reason,
                status: isShowCause ? enums_1.WarningStatus.SHOW_CAUSE : enums_1.WarningStatus.ACTIVE,
                appealDeadline,
                fineAmount: payload.fineAmount ?? 0,
                expiresAt: isShowCause ? null : expiresAt,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        studentUniId: true,
                        email: true,
                        warningCount: true,
                        isExpelled: true,
                    },
                },
                hall: { select: { id: true, name: true, shortName: true } },
            },
        });
        if (!isShowCause) {
            if (willExpel) {
                // 3-Strike Auto-Expulsion + Atomic Seat Revocation
                await tx.student.update({
                    where: { id: student.id },
                    data: {
                        warningCount: nextStrikeNumber,
                        isExpelled: true,
                        expelledAt: new Date(),
                        isResident: false,
                        hallId: null,
                        roomId: null,
                    },
                });
                // Free up the student's room seat if currently allocated
                if (student.isResident && student.roomId) {
                    const room = await tx.room.findUnique({
                        where: { id: student.roomId },
                    });
                    if (room) {
                        const updatedOccupied = Math.max(0, room.occupiedCount - 1);
                        await tx.room.update({
                            where: { id: room.id },
                            data: {
                                occupiedCount: updatedOccupied,
                                status: room.status === enums_1.RoomStatus.MAINTENANCE
                                    ? enums_1.RoomStatus.MAINTENANCE
                                    : updatedOccupied < room.capacity
                                        ? enums_1.RoomStatus.AVAILABLE
                                        : enums_1.RoomStatus.FULL,
                            },
                        });
                    }
                }
            }
            else {
                await tx.student.update({
                    where: { id: student.id },
                    data: {
                        warningCount: nextStrikeNumber,
                    },
                });
            }
        }
        return warning;
    });
    // Trigger EJS Email Notification (Non-blocking)
    if (isShowCause) {
        await notifyStudentDisciplinaryAction({
            to: student.email,
            studentName: student.name,
            studentUniId: student.studentUniId,
            hallName: student.hall?.name,
            subject: `[Show-Cause Notice] ${payload.title} - DIU SmartHall`,
            noticeType: "SHOW-CAUSE NOTICE",
            headerClass: "header-warning",
            heading: "Official Show-Cause Notice Issued",
            message: `A formal show-cause notice has been issued regarding: "${payload.reason}". Please submit your explanation before the deadline.`,
            category,
            severity,
            fineAmount: payload.fineAmount,
            appealDeadline,
        });
    }
    else if (willExpel) {
        await notifyStudentDisciplinaryAction({
            to: student.email,
            studentName: student.name,
            studentUniId: student.studentUniId,
            hallName: student.hall?.name,
            subject: `[URGENT: Hall Expulsion Notice] DIU SmartHall`,
            noticeType: "EXPULSION & SEAT REVOCATION",
            headerClass: "header-danger",
            heading: "Hall Residence Expulsion & Seat Cancellation",
            message: `Due to reaching Strike ${nextStrikeNumber} (or severe misconduct: "${payload.reason}"), your hall residency has been revoked and your seat has been vacated immediately.`,
            category,
            severity,
            strikeNumber: nextStrikeNumber,
            fineAmount: payload.fineAmount,
        });
    }
    else {
        const isAtRisk = nextStrikeNumber === 2;
        await notifyStudentDisciplinaryAction({
            to: student.email,
            studentName: student.name,
            studentUniId: student.studentUniId,
            hallName: student.hall?.name,
            subject: isAtRisk
                ? `[AT-RISK ALERT: Strike 2/3] ${payload.title} - DIU SmartHall`
                : `[Disciplinary Warning: Strike ${nextStrikeNumber}/3] ${payload.title}`,
            noticeType: isAtRisk ? "AT-RISK FINAL WARNING" : "DISCIPLINARY WARNING",
            headerClass: isAtRisk ? "header-warning" : "header-default",
            heading: isAtRisk
                ? "Final Warning — You Are Now in AT-RISK Status (Strike 2/3)"
                : `Disciplinary Warning Issued (Strike ${nextStrikeNumber}/3)`,
            message: `Reason: ${payload.reason}`,
            category,
            severity,
            strikeNumber: nextStrikeNumber,
            fineAmount: payload.fineAmount,
            appealDeadline,
            expiresAt,
        });
    }
    return {
        warning: result,
        autoExpelled: willExpel,
        isAtRisk: !willExpel && !isShowCause && nextStrikeNumber === 2,
    };
};
// ============================================================================
// 1. INCIDENT & PEER MEDIATION SERVICES
// ============================================================================
const createIncidentReport = async (reporterUserId, payload) => {
    // 1. Verify reporter is an active user
    const reporterUser = await prisma_1.prisma.user.findUnique({
        where: { id: reporterUserId },
        include: { student: true },
    });
    if (!reporterUser || reporterUser.status !== enums_1.UserStatus.ACTIVE) {
        throw new Error("Reporter account is invalid or inactive.");
    }
    // 2. If reporter is a student, ensure they are a current hall resident
    if (reporterUser.role === enums_1.Role.STUDENT) {
        if (!reporterUser.student ||
            reporterUser.student.isDeleted ||
            !reporterUser.student.isResident) {
            throw new Error("Only current hall residents can submit an incident report.");
        }
    }
    // 3. Verify accused student exists and is an active hall resident
    const accusedStudent = await findStudentByIdentifier(payload.accusedStudentId);
    if (!accusedStudent.isResident) {
        throw new Error("The accused student is not currently a hall resident.");
    }
    // 4. Prevent self-reporting
    if (accusedStudent.userId === reporterUserId) {
        throw new Error("You cannot file an incident report against yourself.");
    }
    const incident = await prisma_1.prisma.incidentReport.create({
        data: {
            reportedById: reporterUserId,
            accusedStudentId: accusedStudent.id,
            hallId: accusedStudent.hallId,
            roomId: accusedStudent.roomId,
            title: payload.title,
            description: payload.description,
            category: payload.category ?? enums_1.IncidentCategory.OTHER,
            severity: payload.severity ?? enums_1.WarningSeverity.MINOR,
            status: enums_1.IncidentStatus.OPEN,
        },
        include: {
            accusedStudent: {
                select: {
                    id: true,
                    name: true,
                    studentUniId: true,
                    department: true,
                },
            },
            hall: { select: { id: true, name: true, shortName: true } },
            room: { select: { id: true, roomNumber: true, floor: true } },
        },
    });
    return incident;
};
const getAllIncidents = async (filters) => {
    const where = {};
    if (filters.hallId)
        where.hallId = filters.hallId;
    if (filters.status)
        where.status = filters.status;
    if (filters.severity)
        where.severity = filters.severity;
    if (filters.category)
        where.category = filters.category;
    if (filters.searchTerm) {
        where.OR = [
            { title: { contains: filters.searchTerm, mode: "insensitive" } },
            { description: { contains: filters.searchTerm, mode: "insensitive" } },
            {
                accusedStudent: {
                    name: { contains: filters.searchTerm, mode: "insensitive" },
                },
            },
            {
                accusedStudent: {
                    studentUniId: { contains: filters.searchTerm, mode: "insensitive" },
                },
            },
        ];
    }
    return prisma_1.prisma.incidentReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            reportedBy: { select: { id: true, name: true, email: true, role: true } },
            accusedStudent: {
                select: {
                    id: true,
                    name: true,
                    studentUniId: true,
                    email: true,
                    warningCount: true,
                },
            },
            hall: { select: { id: true, name: true, shortName: true } },
            room: { select: { id: true, roomNumber: true, floor: true } },
            escalatedWarning: {
                select: { id: true, strikeNumber: true, status: true },
            },
        },
    });
};
const resolveOrEscalateIncident = async (incidentId, adminUserId, payload) => {
    const incident = await prisma_1.prisma.incidentReport.findUnique({
        where: { id: incidentId },
        include: { accusedStudent: true },
    });
    if (!incident) {
        throw new Error("Incident report not found.");
    }
    if (incident.status === enums_1.IncidentStatus.RESOLVED ||
        incident.status === enums_1.IncidentStatus.ESCALATED ||
        incident.status === enums_1.IncidentStatus.DISMISSED) {
        throw new Error(`This incident is already closed with status: ${incident.status}.`);
    }
    if (payload.action === "ESCALATED") {
        const updatedIncident = await prisma_1.prisma.incidentReport.update({
            where: { id: incidentId },
            data: {
                status: enums_1.IncidentStatus.ESCALATED,
                mediationNotes: payload.mediationNotes,
                resolvedById: adminUserId,
                resolvedAt: new Date(),
            },
        });
        const warningResult = await executeIssueWarning(adminUserId, {
            studentId: incident.accusedStudentId,
            title: incident.title,
            reason: `${incident.description} | Admin Note: ${payload.mediationNotes}`,
            category: incident.category,
            severity: incident.severity,
            issueAsShowCause: payload.issueAsShowCause,
            appealHours: payload.appealHours,
            fineAmount: payload.fineAmount,
            expiryDays: payload.expiryDays,
        }, incident.id);
        return {
            incident: updatedIncident,
            escalatedAction: warningResult,
        };
    }
    const isClosing = payload.action === "RESOLVED" || payload.action === "DISMISSED";
    const updatedIncident = await prisma_1.prisma.incidentReport.update({
        where: { id: incidentId },
        data: {
            status: payload.action,
            mediationNotes: payload.mediationNotes,
            ...(isClosing
                ? { resolvedById: adminUserId, resolvedAt: new Date() }
                : {}),
        },
        include: {
            accusedStudent: {
                select: { id: true, name: true, studentUniId: true },
            },
        },
    });
    return { incident: updatedIncident };
};
// ============================================================================
// 2. WARNING, SHOW-CAUSE & APPEAL SERVICES
// ============================================================================
const issueWarning = async (adminUserId, payload) => {
    return executeIssueWarning(adminUserId, payload);
};
const getAllWarnings = async (filters) => {
    await syncExpiredWarnings();
    const where = {};
    if (filters.hallId)
        where.hallId = filters.hallId;
    if (filters.studentId)
        where.studentId = filters.studentId;
    if (filters.status)
        where.status = filters.status;
    if (filters.severity)
        where.severity = filters.severity;
    if (filters.category)
        where.category = filters.category;
    if (filters.searchTerm) {
        where.OR = [
            { title: { contains: filters.searchTerm, mode: "insensitive" } },
            { reason: { contains: filters.searchTerm, mode: "insensitive" } },
            {
                student: {
                    name: { contains: filters.searchTerm, mode: "insensitive" },
                },
            },
            {
                student: {
                    studentUniId: { contains: filters.searchTerm, mode: "insensitive" },
                },
            },
        ];
    }
    return prisma_1.prisma.studentWarning.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            student: {
                select: {
                    id: true,
                    name: true,
                    studentUniId: true,
                    email: true,
                    department: true,
                    warningCount: true,
                    isExpelled: true,
                },
            },
            hall: { select: { id: true, name: true, shortName: true } },
            issuedBy: { select: { id: true, name: true, email: true } },
        },
    });
};
const getMyWarnings = async (userId) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { userId },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    await syncExpiredWarnings(student.id);
    const warnings = await prisma_1.prisma.studentWarning.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            strikeNumber: true,
            category: true,
            severity: true,
            title: true,
            reason: true,
            status: true,
            appealDeadline: true,
            appealText: true,
            appealedAt: true,
            reviewNote: true,
            fineAmount: true,
            isFinePaid: true,
            finePaidAt: true,
            expiresAt: true,
            revokeReason: true,
            revokedAt: true,
            createdAt: true,
            updatedAt: true,
            hall: { select: { id: true, name: true, shortName: true } },
        },
    });
    return {
        warningCount: warnings.filter((w) => w.status === enums_1.WarningStatus.ACTIVE)
            .length,
        isExpelled: student.isExpelled,
        warnings,
    };
};
const submitAppeal = async (userId, warningId, payload) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { userId },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    const warning = await prisma_1.prisma.studentWarning.findUnique({
        where: { id: warningId },
    });
    if (!warning || warning.studentId !== student.id) {
        throw new Error("Disciplinary notice not found.");
    }
    if (warning.status !== enums_1.WarningStatus.SHOW_CAUSE &&
        warning.status !== enums_1.WarningStatus.ACTIVE) {
        throw new Error(`Cannot submit an appeal for a notice with status: ${warning.status}.`);
    }
    if (warning.appealedAt) {
        throw new Error("You have already submitted an appeal for this notice.");
    }
    if (warning.appealDeadline && new Date() > warning.appealDeadline) {
        throw new Error("The appeal deadline for this notice has expired.");
    }
    return prisma_1.prisma.studentWarning.update({
        where: { id: warningId },
        data: {
            appealText: payload.appealText,
            appealedAt: new Date(),
        },
    });
};
const reviewAppeal = async (warningId, adminUserId, payload) => {
    const warning = await prisma_1.prisma.studentWarning.findUnique({
        where: { id: warningId },
        include: {
            student: {
                include: { hall: { select: { name: true } } },
            },
        },
    });
    if (!warning) {
        throw new Error("Disciplinary notice not found.");
    }
    if (warning.status !== enums_1.WarningStatus.SHOW_CAUSE &&
        warning.status !== enums_1.WarningStatus.ACTIVE) {
        throw new Error(`Notice is already finalized with status: ${warning.status}.`);
    }
    // Case A: Appeal Accepted -> Revoke Notice & Recalculate Active Strikes
    if (payload.decision === "REVOKE") {
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            const revokedWarning = await tx.studentWarning.update({
                where: { id: warningId },
                data: {
                    status: enums_1.WarningStatus.REVOKED,
                    revokeReason: payload.reviewNote,
                    reviewNote: payload.reviewNote,
                    revokedAt: new Date(),
                    revokedById: adminUserId,
                },
            });
            const remainingActive = await tx.studentWarning.count({
                where: {
                    studentId: warning.studentId,
                    status: enums_1.WarningStatus.ACTIVE,
                },
            });
            await tx.student.update({
                where: { id: warning.studentId },
                data: { warningCount: remainingActive },
            });
            return revokedWarning;
        });
        await notifyStudentDisciplinaryAction({
            to: warning.student.email,
            studentName: warning.student.name,
            studentUniId: warning.student.studentUniId,
            hallName: warning.student.hall?.name,
            subject: `[Appeal Accepted] Notice Revoked - DIU SmartHall`,
            noticeType: "APPEAL ACCEPTED",
            headerClass: "header-success",
            heading: "Disciplinary Notice Revoked After Review",
            message: `Your explanation has been accepted and the disciplinary notice "${warning.title}" has been revoked. Review Note: ${payload.reviewNote}`,
        });
        return updated;
    }
    // Case B: Appeal Rejected / Upheld
    if (warning.status === enums_1.WarningStatus.SHOW_CAUSE) {
        await syncExpiredWarnings(warning.studentId);
        const currentActive = await prisma_1.prisma.studentWarning.count({
            where: {
                studentId: warning.studentId,
                status: enums_1.WarningStatus.ACTIVE,
            },
        });
        const newStrike = Math.min(currentActive + 1, 3);
        const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
        const willExpel = newStrike >= 3;
        const confirmed = await prisma_1.prisma.$transaction(async (tx) => {
            const confirmedWarning = await tx.studentWarning.update({
                where: { id: warningId },
                data: {
                    status: enums_1.WarningStatus.ACTIVE,
                    strikeNumber: newStrike,
                    reviewNote: payload.reviewNote,
                    expiresAt,
                },
            });
            await tx.student.update({
                where: { id: warning.studentId },
                data: {
                    warningCount: newStrike,
                    ...(willExpel
                        ? {
                            isExpelled: true,
                            expelledAt: new Date(),
                            isResident: false,
                            hallId: null,
                            roomId: null,
                        }
                        : {}),
                },
            });
            if (willExpel && warning.student.isResident && warning.student.roomId) {
                const room = await tx.room.findUnique({
                    where: { id: warning.student.roomId },
                });
                if (room) {
                    const updatedOccupied = Math.max(0, room.occupiedCount - 1);
                    await tx.room.update({
                        where: { id: room.id },
                        data: {
                            occupiedCount: updatedOccupied,
                            status: room.status === enums_1.RoomStatus.MAINTENANCE
                                ? enums_1.RoomStatus.MAINTENANCE
                                : updatedOccupied < room.capacity
                                    ? enums_1.RoomStatus.AVAILABLE
                                    : enums_1.RoomStatus.FULL,
                        },
                    });
                }
            }
            return confirmedWarning;
        });
        await notifyStudentDisciplinaryAction({
            to: warning.student.email,
            studentName: warning.student.name,
            studentUniId: warning.student.studentUniId,
            hallName: warning.student.hall?.name,
            subject: willExpel
                ? `[URGENT: Hall Expulsion Notice] DIU SmartHall`
                : `[Show-Cause Upheld: Strike ${newStrike}/3] ${warning.title}`,
            noticeType: willExpel ? "EXPULSION & SEAT REVOCATION" : "WARNING UPHELD",
            headerClass: willExpel ? "header-danger" : "header-warning",
            heading: willExpel
                ? "Hall Residence Expulsion & Seat Cancellation"
                : `Show-Cause Upheld — Active Strike ${newStrike}/3 Recorded`,
            message: `After reviewing your response, the notice "${warning.title}" has been upheld. Admin Note: ${payload.reviewNote}`,
            category: warning.category,
            severity: warning.severity,
            strikeNumber: newStrike,
            fineAmount: warning.fineAmount,
            expiresAt: willExpel ? null : expiresAt,
        });
        return confirmed;
    }
    return prisma_1.prisma.studentWarning.update({
        where: { id: warningId },
        data: { reviewNote: payload.reviewNote },
    });
};
// ============================================================================
// 3. FINE PAYMENT, DIGITAL CLEARANCE, REVOCATION & ANALYTICS
// ============================================================================
const markFinePaid = async (warningId) => {
    const warning = await prisma_1.prisma.studentWarning.findUnique({
        where: { id: warningId },
    });
    if (!warning) {
        throw new Error("Warning record not found.");
    }
    if (warning.fineAmount <= 0) {
        throw new Error("There is no fine associated with this warning.");
    }
    if (warning.isFinePaid) {
        throw new Error("This fine is already marked paid.");
    }
    return prisma_1.prisma.studentWarning.update({
        where: { id: warningId },
        data: {
            isFinePaid: true,
            finePaidAt: new Date(),
        },
    });
};
const getMyConductClearance = async (userId) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { userId },
        include: {
            hall: { select: { name: true, shortName: true } },
            room: { select: { roomNumber: true, floor: true } },
        },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    await syncExpiredWarnings(student.id);
    const warnings = await prisma_1.prisma.studentWarning.findMany({
        where: { studentId: student.id },
    });
    const activeWarnings = warnings.filter((w) => w.status === enums_1.WarningStatus.ACTIVE);
    const pendingShowCause = warnings.filter((w) => w.status === enums_1.WarningStatus.SHOW_CAUSE);
    const unpaidFines = warnings.filter((w) => w.fineAmount > 0 && !w.isFinePaid && w.status !== enums_1.WarningStatus.REVOKED);
    const totalUnpaidFineAmount = unpaidFines.reduce((sum, w) => sum + w.fineAmount, 0);
    let clearanceStatus = "CLEARED";
    if (student.isExpelled ||
        totalUnpaidFineAmount > 0 ||
        pendingShowCause.length > 0) {
        clearanceStatus = "HOLD";
    }
    else if (activeWarnings.length > 0) {
        clearanceStatus = "PROBATION";
    }
    return {
        studentName: student.name,
        studentUniId: student.studentUniId,
        hall: student.hall,
        room: student.room,
        clearanceStatus,
        isExpelled: student.isExpelled,
        activeStrikeCount: activeWarnings.length,
        pendingShowCauseCount: pendingShowCause.length,
        totalUnpaidFineAmount,
        checkedAt: new Date(),
    };
};
const revokeExpulsion = async (studentId, payload) => {
    const student = await findStudentByIdentifier(studentId);
    if (!student.isExpelled) {
        throw new Error("This student is not currently expelled.");
    }
    return prisma_1.prisma.$transaction(async (tx) => {
        await tx.studentWarning.updateMany({
            where: {
                studentId: student.id,
                status: { in: [enums_1.WarningStatus.ACTIVE, enums_1.WarningStatus.SHOW_CAUSE] },
            },
            data: {
                status: enums_1.WarningStatus.REVOKED,
                revokeReason: `Expulsion Revoked (Clemency): ${payload.revokeReason}`,
                revokedAt: new Date(),
            },
        });
        return tx.student.update({
            where: { id: student.id },
            data: {
                isExpelled: false,
                expelledAt: null,
                warningCount: 0,
            },
            select: {
                id: true,
                name: true,
                studentUniId: true,
                email: true,
                isExpelled: true,
                warningCount: true,
            },
        });
    });
};
const getDisciplineAnalytics = async (hallId) => {
    await syncExpiredWarnings();
    const hallFilter = hallId ? { hallId } : {};
    const [totalIncidents, openIncidents, activeWarnings, showCauseNotices, expelledStudentsCount, atRiskStudents, fineStats,] = await Promise.all([
        prisma_1.prisma.incidentReport.count({ where: hallFilter }),
        prisma_1.prisma.incidentReport.count({
            where: {
                ...hallFilter,
                status: { in: [enums_1.IncidentStatus.OPEN, enums_1.IncidentStatus.MEDIATING] },
            },
        }),
        prisma_1.prisma.studentWarning.count({
            where: { ...hallFilter, status: enums_1.WarningStatus.ACTIVE },
        }),
        prisma_1.prisma.studentWarning.count({
            where: { ...hallFilter, status: enums_1.WarningStatus.SHOW_CAUSE },
        }),
        prisma_1.prisma.student.count({
            where: { isExpelled: true, isDeleted: false },
        }),
        prisma_1.prisma.student.findMany({
            where: {
                ...hallFilter,
                warningCount: 2,
                isExpelled: false,
                isDeleted: false,
            },
            select: {
                id: true,
                name: true,
                studentUniId: true,
                email: true,
                department: true,
                warningCount: true,
                hall: { select: { name: true, shortName: true } },
                room: { select: { roomNumber: true, floor: true } },
            },
        }),
        prisma_1.prisma.studentWarning.findMany({
            where: {
                ...hallFilter,
                fineAmount: { gt: 0 },
                status: { not: enums_1.WarningStatus.REVOKED },
            },
            select: { fineAmount: true, isFinePaid: true },
        }),
    ]);
    const totalCollectedFine = fineStats
        .filter((f) => f.isFinePaid)
        .reduce((sum, f) => sum + f.fineAmount, 0);
    const totalPendingFine = fineStats
        .filter((f) => !f.isFinePaid)
        .reduce((sum, f) => sum + f.fineAmount, 0);
    return {
        summary: {
            totalIncidents,
            openIncidents,
            activeWarnings,
            showCauseNotices,
            atRiskStudentsCount: atRiskStudents.length,
            expelledStudentsCount,
            totalCollectedFine,
            totalPendingFine,
        },
        atRiskStudents,
    };
};
exports.DisciplineService = {
    createIncidentReport,
    getAllIncidents,
    resolveOrEscalateIncident,
    issueWarning,
    getAllWarnings,
    getMyWarnings,
    submitAppeal,
    reviewAppeal,
    markFinePaid,
    getMyConductClearance,
    revokeExpulsion,
    getDisciplineAnalytics,
};
