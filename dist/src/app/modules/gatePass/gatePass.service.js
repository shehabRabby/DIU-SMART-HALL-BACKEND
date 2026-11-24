import crypto from "crypto";
import ejs from "ejs";
import path from "path";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { transporter } from "../../lib/nodemailer";
/**
 * Helper 1: Verify Student is an active, non-expelled hall resident
 */
const verifyActiveResidentStudent = async (userId) => {
    const student = await prisma.student.findUnique({
        where: { userId },
        select: {
            id: true,
            name: true,
            studentUniId: true,
            hallId: true,
            roomId: true,
            isResident: true,
            isExpelled: true,
            isDeleted: true,
            warningCount: true,
            hall: { select: { id: true, name: true, shortName: true, isActive: true } },
            room: { select: { roomNumber: true } },
        },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    if (student.isExpelled) {
        throw new Error("Access denied: Expelled students cannot request gate passes.");
    }
    if (!student.isResident ||
        !student.hallId ||
        !student.roomId ||
        !student.hall?.isActive) {
        throw new Error("Access denied: Only active resident hall students with an allocated room can request a gate pass.");
    }
    return student;
};
/**
 * Helper 2: Generate Unique Pass Code & Tamper-Evident QR Token
 */
const generatePassCredentials = () => {
    const randomDigits = crypto.randomInt(100000, 999999);
    const passCode = `DIU-GP-${randomDigits}`;
    const qrToken = crypto.randomBytes(24).toString("hex");
    return { passCode, qrToken };
};
/**
 * Helper 3: Render EJS Template & Send Approved Gate Pass Email
 */
const sendGatePassApprovedEmail = async (recipientEmail, templateData) => {
    const templatePath = path.join(process.cwd(), "src", "app", "templates", "gate-pass-approved.ejs");
    const html = await ejs.renderFile(templatePath, templateData);
    await transporter.sendMail({
        from: `"DIU SmartHall" <${config.smtp_user}>`,
        to: recipientEmail,
        subject: templateData.subject,
        html,
    });
};
/**
 * 1. Create Gate Pass / Leave / Late Entry Request (Student)
 */
const createGatePassRequest = async (userId, payload) => {
    const student = await verifyActiveResidentStudent(userId);
    const departureAt = new Date(payload.departureAt);
    const expectedReturnAt = new Date(payload.expectedReturnAt);
    if (expectedReturnAt <= new Date()) {
        throw new Error("Expected return time must be in the future.");
    }
    // Prevent duplicate active/pending requests
    const existingOpenPass = await prisma.gatePass.findFirst({
        where: {
            studentId: student.id,
            status: { in: ["PENDING", "APPROVED", "CHECKED_OUT"] },
        },
        select: { id: true, passType: true, status: true },
    });
    if (existingOpenPass) {
        throw new Error(`You already have an active or pending ${existingOpenPass.passType} pass (${existingOpenPass.status}). Complete or cancel it first.`);
    }
    return prisma.gatePass.create({
        data: {
            studentId: student.id,
            hallId: student.hallId,
            passType: payload.passType,
            reason: payload.reason,
            destination: payload.destination,
            emergencyContact: payload.emergencyContact,
            departureAt,
            expectedReturnAt,
        },
        include: {
            hall: { select: { name: true, shortName: true, genderType: true } },
        },
    });
};
/**
 * 2. Get Logged-in Student's Own Gate Passes & QR Tokens (Student)
 */
const getMyGatePasses = async (userId) => {
    const student = await verifyActiveResidentStudent(userId);
    return prisma.gatePass.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        include: {
            hall: { select: { name: true, shortName: true } },
        },
    });
};
/**
 * 3. Cancel Own Pending Request (Student)
 */
const cancelMyGatePass = async (userId, passId) => {
    const student = await verifyActiveResidentStudent(userId);
    const pass = await prisma.gatePass.findUnique({ where: { id: passId } });
    if (!pass || pass.studentId !== student.id) {
        throw new Error("Gate pass request not found.");
    }
    if (pass.status !== "PENDING") {
        throw new Error("Only PENDING gate pass requests can be cancelled.");
    }
    return prisma.gatePass.update({
        where: { id: passId },
        data: { status: "CANCELLED" },
    });
};
/**
 * 4. Get All Gate Passes for Admin (with Overdue Safeguarding & Discipline Warning Flag)
 */
const getAllGatePassesForAdmin = async (filters) => {
    const now = new Date();
    const andConditions = [];
    if (filters.hallId) {
        andConditions.push({ hallId: filters.hallId });
    }
    if (filters.status) {
        andConditions.push({ status: filters.status });
    }
    if (filters.passType) {
        andConditions.push({ passType: filters.passType });
    }
    if (filters.overdueOnly === "true") {
        andConditions.push({
            status: { in: ["APPROVED", "CHECKED_OUT"] },
            expectedReturnAt: { lt: now },
        });
    }
    if (filters.searchTerm) {
        andConditions.push({
            OR: [
                { passCode: { contains: filters.searchTerm, mode: "insensitive" } },
                { destination: { contains: filters.searchTerm, mode: "insensitive" } },
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
            ],
        });
    }
    const passes = await prisma.gatePass.findMany({
        where: andConditions.length ? { AND: andConditions } : {},
        orderBy: { createdAt: "desc" },
        include: {
            hall: {
                select: { id: true, name: true, shortName: true, genderType: true },
            },
            student: {
                select: {
                    id: true,
                    name: true,
                    studentUniId: true,
                    department: true,
                    contactNumber: true,
                    parentPhoneNumber: true,
                    warningCount: true,
                    room: { select: { roomNumber: true, floor: true } },
                },
            },
            reviewedBy: { select: { id: true, name: true } },
        },
    });
    // Attach dynamic overdue & disciplinary safeguarding flags
    return passes.map((pass) => {
        const isOverdue = ["APPROVED", "CHECKED_OUT"].includes(pass.status) &&
            pass.expectedReturnAt < now;
        return {
            ...pass,
            isOverdue,
            hasDisciplinaryFlag: pass.student.warningCount > 0,
        };
    });
};
/**
 * 5. Approve or Reject Gate Pass + Generate Unique QR Credentials & Email Pass (Admin)
 */
const reviewGatePass = async (adminUserId, passId, payload) => {
    const pass = await prisma.gatePass.findUnique({
        where: { id: passId },
        include: {
            student: { select: { isResident: true, isExpelled: true } },
        },
    });
    if (!pass) {
        throw new Error("Gate pass request not found.");
    }
    if (pass.status !== "PENDING") {
        throw new Error(`Cannot review a pass that is already ${pass.status}.`);
    }
    if (payload.status === "APPROVED") {
        if (!pass.student.isResident || pass.student.isExpelled) {
            throw new Error("Cannot approve: Student is no longer an active hall resident.");
        }
        const { passCode, qrToken } = generatePassCredentials();
        const approvedPass = await prisma.gatePass.update({
            where: { id: passId },
            data: {
                status: "APPROVED",
                passCode,
                qrToken,
                adminNote: payload.adminNote ?? null,
                reviewedById: adminUserId,
                reviewedAt: new Date(),
            },
            include: {
                hall: { select: { name: true, shortName: true } },
                student: {
                    select: {
                        name: true,
                        studentUniId: true,
                        email: true,
                        room: { select: { roomNumber: true, floor: true } },
                    },
                },
            },
        });
        const formatDateTime = (date) => new Date(date).toLocaleString("en-BD", {
            timeZone: "Asia/Dhaka",
            dateStyle: "medium",
            timeStyle: "short",
        });
        const subject = `Approved Gate Pass (${passCode}) — ${approvedPass.hall.shortName}`;
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(qrToken)}`;
        const roomInfo = approvedPass.student.room
            ? `Room ${approvedPass.student.room.roomNumber} (Floor ${approvedPass.student.room.floor})`
            : "N/A";
        sendGatePassApprovedEmail(approvedPass.student.email, {
            subject,
            studentName: approvedPass.student.name,
            studentUniId: approvedPass.student.studentUniId ?? "N/A",
            hallName: approvedPass.hall.name,
            hallShortName: approvedPass.hall.shortName,
            roomInfo,
            passCode,
            qrImageUrl,
            passType: approvedPass.passType,
            destination: approvedPass.destination,
            reason: approvedPass.reason,
            departureAt: formatDateTime(approvedPass.departureAt),
            expectedReturnAt: formatDateTime(approvedPass.expectedReturnAt),
            adminNote: approvedPass.adminNote,
        }).catch((err) => {
            console.error("Failed to send approved gate pass email:", err);
        });
        return approvedPass;
    }
    return prisma.gatePass.update({
        where: { id: passId },
        data: {
            status: "REJECTED",
            adminNote: payload.adminNote ?? null,
            reviewedById: adminUserId,
            reviewedAt: new Date(),
        },
    });
};
/**
 * 6. Verify QR Code / Pass Code at Main Gate (Admin / Gate Security)
 */
const verifyGatePassQr = async (identifier) => {
    const pass = await prisma.gatePass.findFirst({
        where: {
            OR: [{ passCode: identifier }, { qrToken: identifier }],
        },
        include: {
            hall: { select: { name: true, shortName: true, genderType: true } },
            student: {
                select: {
                    name: true,
                    studentUniId: true,
                    contactNumber: true,
                    isResident: true,
                    isExpelled: true,
                    room: { select: { roomNumber: true, floor: true } },
                },
            },
        },
    });
    if (!pass) {
        return {
            isValid: false,
            verificationStatus: "INVALID_CODE",
            message: "No gate pass found matching this QR code or pass code.",
        };
    }
    const now = new Date();
    if (pass.isQrUsed || pass.status === "RETURNED") {
        return {
            isValid: false,
            verificationStatus: "ALREADY_USED",
            message: "This QR pass has already been used and is no longer valid.",
            pass,
        };
    }
    if (pass.status !== "APPROVED" && pass.status !== "CHECKED_OUT") {
        return {
            isValid: false,
            verificationStatus: "NOT_APPROVED",
            message: `Gate pass status is ${pass.status}. Entry/Exit not permitted.`,
            pass,
        };
    }
    if (!pass.student.isResident || pass.student.isExpelled) {
        return {
            isValid: false,
            verificationStatus: "RESIDENCY_REVOKED",
            message: "Student is no longer an active resident of the hall.",
            pass,
        };
    }
    const isExpired = pass.expectedReturnAt < now;
    return {
        isValid: !isExpired,
        verificationStatus: isExpired ? "EXPIRED_OVERDUE" : "VALID",
        message: isExpired
            ? "Pass time limit has expired (Late/Overdue). Manual admin clearance required."
            : "Valid QR Gate Pass verified.",
        pass,
    };
};
/**
 * 7. Update Gate Log: CHECKED_OUT or RETURNED (Invalidates QR on Return/Entry)
 */
const updateGateLog = async (passId, payload) => {
    const pass = await prisma.gatePass.findUnique({ where: { id: passId } });
    if (!pass) {
        throw new Error("Gate pass not found.");
    }
    const now = new Date();
    if (payload.action === "CHECKED_OUT") {
        if (pass.status !== "APPROVED") {
            throw new Error("Only APPROVED passes can be marked as CHECKED_OUT.");
        }
        if (pass.passType === "LATE_ENTRY") {
            throw new Error("LATE_ENTRY passes are for hall entry only—mark directly as RETURNED upon arrival.");
        }
        return prisma.gatePass.update({
            where: { id: passId },
            data: {
                status: "CHECKED_OUT",
                checkedOutAt: now,
            },
        });
    }
    // Action: RETURNED (Valid for both LATE_ENTRY arrival and returning from leave)
    if (pass.status !== "APPROVED" && pass.status !== "CHECKED_OUT") {
        throw new Error("Only APPROVED or CHECKED_OUT passes can be marked as RETURNED.");
    }
    return prisma.gatePass.update({
        where: { id: passId },
        data: {
            status: "RETURNED",
            actualReturnAt: now,
            isQrUsed: true, // One-time QR becomes permanently invalid upon entry/return
        },
    });
};
export const GatePassService = {
    createGatePassRequest,
    getMyGatePasses,
    cancelMyGatePass,
    getAllGatePassesForAdmin,
    reviewGatePass,
    verifyGatePassQr,
    updateGateLog,
};
