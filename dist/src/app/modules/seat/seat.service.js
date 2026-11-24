"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatService = void 0;
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const enums_1 = require("../../../generated/prisma/enums");
const config_1 = __importDefault(require("../../config"));
const prisma_1 = require("../../lib/prisma");
const nodemailer_1 = require("../../lib/nodemailer");
// INTERNAL EMAIL HELPERS (Non-Blocking Safe)
const sendSeatAllocationEmail = async (params) => {
    try {
        const templatePath = path_1.default.join(process.cwd(), "src", "app", "templates", "seat-allocation-approved.ejs");
        const html = await ejs_1.default.renderFile(templatePath, {
            name: params.name,
            hallName: params.hallName,
            hallShortName: params.hallShortName,
            floor: params.floor,
            roomNumber: params.roomNumber,
            monthlyFee: params.monthlyFee,
            adminNote: params.adminNote ?? null,
        });
        await nodemailer_1.transporter.sendMail({
            from: `"DIU Smart Hall" <${config_1.default.smtp_user}>`,
            to: params.to,
            subject: `Seat Allocated: ${params.hallShortName} - Room ${params.roomNumber}`,
            html,
        });
    }
    catch (error) {
        console.error("Failed to send seat allocation email:", error);
    }
};
const sendSeatStatusEmail = async (params) => {
    try {
        const templatePath = path_1.default.join(process.cwd(), "src", "app", "templates", "seat-status-notification.ejs");
        const html = await ejs_1.default.renderFile(templatePath, {
            subject: params.subject,
            heading: params.heading,
            statusType: params.statusType,
            name: params.name,
            message: params.message,
            details: params.details ?? [],
        });
        await nodemailer_1.transporter.sendMail({
            from: `"DIU Smart Hall" <${config_1.default.smtp_user}>`,
            to: params.to,
            subject: params.subject,
            html,
        });
    }
    catch (error) {
        console.error("Failed to send seat status email:", error);
    }
};
// 1. SEAT APPLICATION SERVICES
const applyForSeat = async (userId, payload) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { userId },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    if (student.isExpelled) {
        throw new Error("You are permanently expelled from residential halls due to disciplinary violations and cannot apply for a seat.");
    }
    if (student.isResident && student.roomId) {
        throw new Error("You already have an allocated hall seat. Use the room change request feature if you want to switch rooms.");
    }
    const existingPendingApp = await prisma_1.prisma.seatApplication.findFirst({
        where: {
            studentId: student.id,
            status: enums_1.ApplicationStatus.PENDING,
        },
    });
    if (existingPendingApp) {
        throw new Error("You already have a pending seat application under review.");
    }
    // 1. Validate University ID against registered student profile
    if (student.studentUniId &&
        student.studentUniId.trim().toLowerCase() !==
            payload.studentUniId.trim().toLowerCase()) {
        throw new Error("Invalid University ID! Provided ID does not match your registered profile.");
    }
    // Ensure studentUniId is not already claimed by another student
    const duplicateUniId = await prisma_1.prisma.student.findFirst({
        where: {
            studentUniId: payload.studentUniId.trim(),
            id: { not: student.id },
            isDeleted: false,
        },
    });
    if (duplicateUniId) {
        throw new Error(`University ID '${payload.studentUniId}' is already registered with another student account.`);
    }
    // 2. Validate Email against registered student profile
    if (student.email.trim().toLowerCase() !== payload.email.trim().toLowerCase()) {
        throw new Error("Invalid Email! Provided email does not match your registered account email.");
    }
    // 3. Validate Department against registered student profile
    if (student.department &&
        student.department.trim().toUpperCase() !==
            payload.department.trim().toUpperCase()) {
        throw new Error("Invalid Department! Provided department does not match your registered profile.");
    }
    const application = await prisma_1.prisma.seatApplication.create({
        data: {
            studentId: student.id,
            studentUniId: payload.studentUniId.trim(),
            email: payload.email.trim().toLowerCase(),
            department: payload.department.trim().toUpperCase(),
            personalPhoneNumber: payload.personalPhoneNumber.trim(),
            parentPhoneNumber: payload.parentPhoneNumber.trim(),
            gender: payload.gender,
            previousAddress: payload.previousAddress.trim(),
            reason: payload.reason?.trim() ?? null,
        },
        include: {
            student: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
    return application;
};
const getMySeatApplications = async (userId) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { userId },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    const applications = await prisma_1.prisma.seatApplication.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        include: {
            allocatedHall: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    monthlyFee: true,
                },
            },
            allocatedRoom: {
                select: {
                    id: true,
                    roomNumber: true,
                    floor: true,
                },
            },
        },
    });
    return applications;
};
const cancelMySeatApplication = async (userId, applicationId) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { userId },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    const application = await prisma_1.prisma.seatApplication.findUnique({
        where: { id: applicationId },
    });
    if (!application || application.studentId !== student.id) {
        throw new Error("Seat application not found.");
    }
    if (application.status !== enums_1.ApplicationStatus.PENDING) {
        throw new Error(`Cannot withdraw an application that is already ${application.status}.`);
    }
    const updated = await prisma_1.prisma.seatApplication.update({
        where: { id: applicationId },
        data: {
            status: enums_1.ApplicationStatus.REJECTED,
            adminNote: "Withdrawn by applicant before admin review.",
            reviewedAt: new Date(),
        },
    });
    return updated;
};
const getMyCurrentSeat = async (userId) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { userId },
        include: {
            hall: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    genderType: true,
                    monthlyFee: true,
                },
            },
            room: {
                include: {
                    students: {
                        where: {
                            isDeleted: false,
                            isResident: true,
                        },
                        select: {
                            id: true,
                            name: true,
                            studentUniId: true,
                            department: true,
                            contactNumber: true,
                            user: {
                                select: {
                                    imageUrl: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    if (!student.isResident || !student.roomId || !student.room) {
        return {
            isResident: false,
            message: "You currently do not have an allocated hall seat.",
            hall: null,
            room: null,
            roommates: [],
        };
    }
    const roommates = student.room.students.filter((s) => s.id !== student.id);
    return {
        isResident: true,
        hall: student.hall,
        room: {
            id: student.room.id,
            roomNumber: student.room.roomNumber,
            floor: student.room.floor,
            capacity: student.room.capacity,
            occupiedCount: student.room.occupiedCount,
            status: student.room.status,
        },
        roommates,
    };
};
const getAllSeatApplications = async (query) => {
    const whereClause = {};
    if (query.status) {
        whereClause.status = query.status;
    }
    if (query.gender) {
        whereClause.gender = query.gender;
    }
    if (query.department) {
        whereClause.department = {
            equals: query.department.trim(),
            mode: "insensitive",
        };
    }
    const applications = await prisma_1.prisma.seatApplication.findMany({
        where: whereClause,
        orderBy: { createdAt: "asc" }, // First-come-first-served queue order
        include: {
            student: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    warningCount: true,
                    isExpelled: true,
                    user: {
                        select: {
                            imageUrl: true,
                        },
                    },
                },
            },
            allocatedHall: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                },
            },
            allocatedRoom: {
                select: {
                    id: true,
                    roomNumber: true,
                    floor: true,
                },
            },
            reviewedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
    return applications;
};
// 2. SMART ROOM RECOMMENDATION ENGINE
const getRecommendedRoomsForApplication = async (applicationId) => {
    const application = await prisma_1.prisma.seatApplication.findUnique({
        where: { id: applicationId },
    });
    if (!application) {
        throw new Error("Seat application not found.");
    }
    const candidateRooms = await prisma_1.prisma.room.findMany({
        where: {
            status: enums_1.RoomStatus.AVAILABLE,
            hall: {
                isActive: true,
                genderType: application.gender,
            },
        },
        include: {
            hall: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    genderType: true,
                    monthlyFee: true,
                },
            },
            students: {
                where: { isDeleted: false },
                select: {
                    name: true,
                    studentUniId: true,
                    department: true,
                },
            },
        },
    });
    const applicantDept = application.department.trim().toUpperCase();
    // Extract DIU batch prefix "221-15" from "221-15-5432"
    const applicantBatchPrefix = application.studentUniId
        .split("-")
        .slice(0, 2)
        .join("-");
    const scoredRooms = candidateRooms
        .filter((room) => room.occupiedCount < room.capacity)
        .map((room) => {
        let matchScore = 0;
        const matchReasons = [];
        const sameDeptMates = room.students.filter((s) => s.department?.toUpperCase() === applicantDept);
        const sameBatchAndDeptMates = sameDeptMates.filter((s) => applicantBatchPrefix.length >= 5 &&
            s.studentUniId?.startsWith(applicantBatchPrefix));
        if (sameBatchAndDeptMates.length > 0) {
            matchScore += 50;
            matchReasons.push(`${sameBatchAndDeptMates.length} batch-mate(s) from ${applicantDept} (${applicantBatchPrefix})`);
        }
        else if (sameDeptMates.length > 0) {
            matchScore += 30;
            matchReasons.push(`${sameDeptMates.length} department-mate(s) from ${applicantDept}`);
        }
        if (room.occupiedCount > 0 && room.occupiedCount < room.capacity) {
            matchScore += 10;
            matchReasons.push(`Active room with ${room.capacity - room.occupiedCount} seat(s) left`);
        }
        else if (room.occupiedCount === 0) {
            matchScore += 5;
            matchReasons.push("Fresh empty room available");
        }
        return {
            roomId: room.id,
            roomNumber: room.roomNumber,
            floor: room.floor,
            capacity: room.capacity,
            occupiedCount: room.occupiedCount,
            availableSeats: room.capacity - room.occupiedCount,
            hall: room.hall,
            matchScore,
            matchReasons,
            currentRoommates: room.students,
        };
    });
    scoredRooms.sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
            return b.matchScore - a.matchScore;
        }
        return a.roomNumber.localeCompare(b.roomNumber);
    });
    return {
        applicant: {
            id: application.id,
            studentUniId: application.studentUniId,
            department: application.department,
            gender: application.gender,
        },
        recommendedRooms: scoredRooms,
    };
};
// 3. APPROVE / REJECT / DIRECT ALLOCATION
const approveSeatApplication = async (reviewerUserId, applicationId, payload) => {
    const application = await prisma_1.prisma.seatApplication.findUnique({
        where: { id: applicationId },
        include: {
            student: true,
        },
    });
    if (!application) {
        throw new Error("Seat application not found.");
    }
    if (application.status !== enums_1.ApplicationStatus.PENDING) {
        throw new Error(`This application has already been ${application.status.toLowerCase()}.`);
    }
    if (application.student.isDeleted || application.student.isExpelled) {
        throw new Error("Student account is inactive or expelled.");
    }
    if (application.student.isResident && application.student.roomId) {
        throw new Error("Student already occupies a hall seat.");
    }
    const hall = await prisma_1.prisma.hall.findUnique({
        where: { id: payload.hallId },
    });
    if (!hall || !hall.isActive) {
        throw new Error("Selected hall does not exist or is currently inactive.");
    }
    if (hall.genderType !== application.gender) {
        throw new Error(`Gender mismatch! Cannot allocate a ${application.gender} student to ${hall.shortName} (${hall.genderType} hall).`);
    }
    const room = await prisma_1.prisma.room.findUnique({
        where: { id: payload.roomId },
    });
    if (!room || room.hallId !== hall.id) {
        throw new Error("Selected room does not belong to the specified hall.");
    }
    if (room.status !== enums_1.RoomStatus.AVAILABLE ||
        room.occupiedCount >= room.capacity) {
        throw new Error(`Room ${room.roomNumber} is not available (Current status: ${room.status}, Occupied: ${room.occupiedCount}/${room.capacity}).`);
    }
    const updatedApplication = await prisma_1.prisma.$transaction(async (tx) => {
        const appRecord = await tx.seatApplication.update({
            where: { id: application.id },
            data: {
                status: enums_1.ApplicationStatus.APPROVED,
                allocatedHallId: hall.id,
                allocatedRoomId: room.id,
                adminNote: payload.adminNote?.trim() ?? null,
                reviewedById: reviewerUserId,
                reviewedAt: new Date(),
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        studentUniId: true,
                        department: true,
                    },
                },
                allocatedHall: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                        monthlyFee: true,
                    },
                },
                allocatedRoom: {
                    select: {
                        id: true,
                        roomNumber: true,
                        floor: true,
                    },
                },
            },
        });
        await tx.student.update({
            where: { id: application.studentId },
            data: {
                isResident: true,
                hallId: hall.id,
                roomId: room.id,
                studentUniId: application.studentUniId,
                department: application.department,
                contactNumber: application.personalPhoneNumber,
                parentPhoneNumber: application.parentPhoneNumber,
                gender: application.gender,
                address: application.previousAddress,
            },
        });
        const newOccupiedCount = room.occupiedCount + 1;
        await tx.room.update({
            where: { id: room.id },
            data: {
                occupiedCount: newOccupiedCount,
                status: newOccupiedCount >= room.capacity
                    ? enums_1.RoomStatus.FULL
                    : enums_1.RoomStatus.AVAILABLE,
            },
        });
        return appRecord;
    });
    await sendSeatAllocationEmail({
        to: application.student.email,
        name: application.student.name,
        hallName: hall.name,
        hallShortName: hall.shortName,
        floor: room.floor,
        roomNumber: room.roomNumber,
        monthlyFee: hall.monthlyFee,
        adminNote: payload.adminNote,
    });
    return updatedApplication;
};
const rejectSeatApplication = async (reviewerUserId, applicationId, payload) => {
    const application = await prisma_1.prisma.seatApplication.findUnique({
        where: { id: applicationId },
        include: {
            student: true,
        },
    });
    if (!application) {
        throw new Error("Seat application not found.");
    }
    if (application.status !== enums_1.ApplicationStatus.PENDING) {
        throw new Error(`This application has already been ${application.status.toLowerCase()}.`);
    }
    const updated = await prisma_1.prisma.seatApplication.update({
        where: { id: application.id },
        data: {
            status: enums_1.ApplicationStatus.REJECTED,
            adminNote: payload.adminNote.trim(),
            reviewedById: reviewerUserId,
            reviewedAt: new Date(),
        },
    });
    await sendSeatStatusEmail({
        to: application.student.email,
        subject: "DIU Smart Hall - Seat Application Update",
        heading: "Seat Application Not Approved",
        statusType: "DANGER",
        name: application.student.name,
        message: "We regret to inform you that your recent hall seat application could not be approved at this time.",
        details: [
            { label: "University ID", value: application.studentUniId },
            { label: "Department", value: application.department },
            { label: "Reason / Admin Note", value: payload.adminNote.trim() },
        ],
    });
    return updated;
};
const directAllocateSeat = async (reviewerUserId, payload) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { id: payload.studentId },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    if (student.isExpelled) {
        throw new Error("Cannot allocate a seat to an expelled student.");
    }
    if (student.isResident && student.roomId) {
        throw new Error("Student already occupies a hall seat.");
    }
    const hall = await prisma_1.prisma.hall.findUnique({
        where: { id: payload.hallId },
    });
    if (!hall || !hall.isActive) {
        throw new Error("Selected hall does not exist or is inactive.");
    }
    const resolvedGender = payload.gender ?? student.gender;
    if (resolvedGender && hall.genderType !== resolvedGender) {
        throw new Error(`Gender mismatch! Student gender (${resolvedGender}) does not match ${hall.shortName} (${hall.genderType}).`);
    }
    const room = await prisma_1.prisma.room.findUnique({
        where: { id: payload.roomId },
    });
    if (!room || room.hallId !== hall.id) {
        throw new Error("Selected room does not belong to the specified hall.");
    }
    if (room.status !== enums_1.RoomStatus.AVAILABLE ||
        room.occupiedCount >= room.capacity) {
        throw new Error(`Room ${room.roomNumber} is not available for allocation.`);
    }
    const updatedStudent = await prisma_1.prisma.$transaction(async (tx) => {
        // Close any pending application if one existed
        await tx.seatApplication.updateMany({
            where: {
                studentId: student.id,
                status: enums_1.ApplicationStatus.PENDING,
            },
            data: {
                status: enums_1.ApplicationStatus.APPROVED,
                allocatedHallId: hall.id,
                allocatedRoomId: room.id,
                adminNote: payload.adminNote?.trim() ??
                    "Directly allocated by Hall Administration.",
                reviewedById: reviewerUserId,
                reviewedAt: new Date(),
            },
        });
        const resStudent = await tx.student.update({
            where: { id: student.id },
            data: {
                isResident: true,
                hallId: hall.id,
                roomId: room.id,
                studentUniId: payload.studentUniId?.trim() ?? student.studentUniId,
                department: payload.department?.trim().toUpperCase() ?? student.department,
                contactNumber: payload.personalPhoneNumber?.trim() ?? student.contactNumber,
                parentPhoneNumber: payload.parentPhoneNumber?.trim() ?? student.parentPhoneNumber,
                gender: resolvedGender,
                address: payload.previousAddress?.trim() ?? student.address,
            },
            include: {
                hall: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true,
                        monthlyFee: true,
                    },
                },
                room: {
                    select: {
                        id: true,
                        roomNumber: true,
                        floor: true,
                    },
                },
            },
        });
        const newOccupiedCount = room.occupiedCount + 1;
        await tx.room.update({
            where: { id: room.id },
            data: {
                occupiedCount: newOccupiedCount,
                status: newOccupiedCount >= room.capacity
                    ? enums_1.RoomStatus.FULL
                    : enums_1.RoomStatus.AVAILABLE,
            },
        });
        return resStudent;
    });
    await sendSeatAllocationEmail({
        to: student.email,
        name: student.name,
        hallName: hall.name,
        hallShortName: hall.shortName,
        floor: room.floor,
        roomNumber: room.roomNumber,
        monthlyFee: hall.monthlyFee,
        adminNote: payload.adminNote ?? "Directly allocated by Hall Administration.",
    });
    return updatedStudent;
};
// 4. ROOM CHANGE REQUEST SERVICES
const requestRoomChange = async (userId, payload) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { userId },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    if (!student.isResident || !student.roomId || !student.hallId) {
        throw new Error("Only current residential students can submit a room change request.");
    }
    const existingPendingRequest = await prisma_1.prisma.roomChangeRequest.findFirst({
        where: {
            studentId: student.id,
            status: enums_1.ApplicationStatus.PENDING,
        },
    });
    if (existingPendingRequest) {
        throw new Error("You already have a pending room change request under review.");
    }
    if (payload.targetRoomId && payload.targetRoomId === student.roomId) {
        throw new Error("Target room cannot be the same as your current room.");
    }
    if (payload.targetHallId) {
        const targetHall = await prisma_1.prisma.hall.findUnique({
            where: { id: payload.targetHallId },
        });
        if (!targetHall || !targetHall.isActive) {
            throw new Error("Preferred hall does not exist or is inactive.");
        }
        if (student.gender && targetHall.genderType !== student.gender) {
            throw new Error(`Gender mismatch! You cannot request a transfer to ${targetHall.shortName} (${targetHall.genderType} hall).`);
        }
    }
    if (payload.targetRoomId) {
        const targetRoom = await prisma_1.prisma.room.findUnique({
            where: { id: payload.targetRoomId },
            include: { hall: true },
        });
        if (!targetRoom) {
            throw new Error("Preferred target room does not exist.");
        }
        if (payload.targetHallId && targetRoom.hallId !== payload.targetHallId) {
            throw new Error("Preferred target room does not belong to the selected target hall.");
        }
        if (student.gender && targetRoom.hall.genderType !== student.gender) {
            throw new Error("Preferred target room belongs to a hall of a different gender.");
        }
    }
    const request = await prisma_1.prisma.roomChangeRequest.create({
        data: {
            studentId: student.id,
            currentRoomId: student.roomId,
            targetHallId: payload.targetHallId ?? null,
            targetRoomId: payload.targetRoomId ?? null,
            reason: payload.reason.trim(),
        },
        include: {
            currentRoom: {
                select: {
                    id: true,
                    roomNumber: true,
                    floor: true,
                    hall: {
                        select: {
                            id: true,
                            shortName: true,
                        },
                    },
                },
            },
            targetHall: { select: { id: true, shortName: true } },
            targetRoom: { select: { id: true, roomNumber: true, floor: true } },
        },
    });
    return request;
};
const getMyRoomChangeRequests = async (userId) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { userId },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    return prisma_1.prisma.roomChangeRequest.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        include: {
            currentRoom: {
                select: {
                    id: true,
                    roomNumber: true,
                    floor: true,
                    hall: {
                        select: {
                            id: true,
                            name: true,
                            shortName: true,
                        },
                    },
                },
            },
            targetHall: { select: { id: true, name: true, shortName: true } },
            targetRoom: { select: { id: true, roomNumber: true, floor: true } },
        },
    });
};
const getAllRoomChangeRequests = async (query) => {
    const whereClause = {};
    if (query.status) {
        whereClause.status = query.status;
    }
    return prisma_1.prisma.roomChangeRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: "asc" },
        include: {
            student: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    studentUniId: true,
                    department: true,
                    gender: true,
                },
            },
            currentRoom: {
                select: {
                    id: true,
                    roomNumber: true,
                    floor: true,
                    hall: {
                        select: {
                            id: true,
                            shortName: true,
                        },
                    },
                },
            },
            targetHall: { select: { id: true, shortName: true } },
            targetRoom: { select: { id: true, roomNumber: true, floor: true } },
        },
    });
};
const approveRoomChange = async (reviewerUserId, requestId, payload) => {
    const request = await prisma_1.prisma.roomChangeRequest.findUnique({
        where: { id: requestId },
        include: {
            student: true,
            currentRoom: {
                include: {
                    hall: true,
                },
            },
        },
    });
    if (!request) {
        throw new Error("Room change request not found.");
    }
    if (request.status !== enums_1.ApplicationStatus.PENDING) {
        throw new Error(`This room change request has already been ${request.status.toLowerCase()}.`);
    }
    if (!request.student.isResident || !request.student.roomId) {
        throw new Error("Student is no longer an active hall resident.");
    }
    if (payload.targetRoomId === request.student.roomId) {
        throw new Error("New room must be different from the student's current room.");
    }
    const targetHall = await prisma_1.prisma.hall.findUnique({
        where: { id: payload.targetHallId },
    });
    if (!targetHall || !targetHall.isActive) {
        throw new Error("Target hall does not exist or is inactive.");
    }
    if (request.student.gender &&
        targetHall.genderType !== request.student.gender) {
        throw new Error(`Gender mismatch! Cannot transfer a ${request.student.gender} student to ${targetHall.shortName}.`);
    }
    const targetRoom = await prisma_1.prisma.room.findUnique({
        where: { id: payload.targetRoomId },
    });
    if (!targetRoom || targetRoom.hallId !== targetHall.id) {
        throw new Error("Target room does not belong to the specified hall.");
    }
    if (targetRoom.status !== enums_1.RoomStatus.AVAILABLE ||
        targetRoom.occupiedCount >= targetRoom.capacity) {
        throw new Error(`Target room ${targetRoom.roomNumber} is not available.`);
    }
    const updatedRequest = await prisma_1.prisma.$transaction(async (tx) => {
        // 1. Release seat from old room
        const oldRoom = await tx.room.findUnique({
            where: { id: request.student.roomId },
        });
        if (oldRoom) {
            const decremented = Math.max(0, oldRoom.occupiedCount - 1);
            await tx.room.update({
                where: { id: oldRoom.id },
                data: {
                    occupiedCount: decremented,
                    status: oldRoom.status === enums_1.RoomStatus.MAINTENANCE
                        ? enums_1.RoomStatus.MAINTENANCE
                        : enums_1.RoomStatus.AVAILABLE,
                },
            });
        }
        // 2. Occupy seat in new room
        const incremented = targetRoom.occupiedCount + 1;
        await tx.room.update({
            where: { id: targetRoom.id },
            data: {
                occupiedCount: incremented,
                status: incremented >= targetRoom.capacity
                    ? enums_1.RoomStatus.FULL
                    : enums_1.RoomStatus.AVAILABLE,
            },
        });
        // 3. Update student assignment
        await tx.student.update({
            where: { id: request.studentId },
            data: {
                hallId: targetHall.id,
                roomId: targetRoom.id,
            },
        });
        // 4. Mark request approved
        return tx.roomChangeRequest.update({
            where: { id: request.id },
            data: {
                status: enums_1.ApplicationStatus.APPROVED,
                targetHallId: targetHall.id,
                targetRoomId: targetRoom.id,
                adminNote: payload.adminNote?.trim() ?? null,
                reviewedById: reviewerUserId,
                reviewedAt: new Date(),
            },
            include: {
                currentRoom: {
                    select: {
                        roomNumber: true,
                        hall: { select: { shortName: true } },
                    },
                },
                targetHall: { select: { name: true, shortName: true } },
                targetRoom: { select: { roomNumber: true, floor: true } },
            },
        });
    });
    await sendSeatStatusEmail({
        to: request.student.email,
        subject: `Room Change Approved: ${targetHall.shortName} - Room ${targetRoom.roomNumber}`,
        heading: "Your Room Change Request is Approved",
        statusType: "SUCCESS",
        name: request.student.name,
        message: "Your room transfer request has been approved by the Hall Administration. Please shift to your newly assigned room.",
        details: [
            {
                label: "Previous Hall & Room",
                value: `${request.currentRoom.hall.shortName} - Room ${request.currentRoom.roomNumber}`,
            },
            {
                label: "New Hall",
                value: `${targetHall.name} (${targetHall.shortName})`,
            },
            {
                label: "New Floor & Room",
                value: `Floor ${targetRoom.floor} - Room ${targetRoom.roomNumber}`,
            },
            ...(payload.adminNote
                ? [{ label: "Admin Note", value: payload.adminNote.trim() }]
                : []),
        ],
    });
    return updatedRequest;
};
const rejectRoomChange = async (reviewerUserId, requestId, payload) => {
    const request = await prisma_1.prisma.roomChangeRequest.findUnique({
        where: { id: requestId },
        include: { student: true },
    });
    if (!request) {
        throw new Error("Room change request not found.");
    }
    if (request.status !== enums_1.ApplicationStatus.PENDING) {
        throw new Error(`This room change request has already been ${request.status.toLowerCase()}.`);
    }
    const updated = await prisma_1.prisma.roomChangeRequest.update({
        where: { id: request.id },
        data: {
            status: enums_1.ApplicationStatus.REJECTED,
            adminNote: payload.adminNote.trim(),
            reviewedById: reviewerUserId,
            reviewedAt: new Date(),
        },
    });
    await sendSeatStatusEmail({
        to: request.student.email,
        subject: "DIU Smart Hall - Room Change Request Update",
        heading: "Room Change Request Not Approved",
        statusType: "DANGER",
        name: request.student.name,
        message: "Your room change request could not be approved at this time. You will continue residing in your current room.",
        details: [
            { label: "Reason / Admin Note", value: payload.adminNote.trim() },
        ],
    });
    return updated;
};
// 5. SEAT CANCELLATION (SELF OR ADMIN)
const cancelSeatByStudent = async (userId, payload) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { userId },
        include: {
            hall: true,
            room: true,
        },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    if (!student.isResident || !student.roomId || !student.room) {
        throw new Error("You do not currently hold an active hall seat.");
    }
    const previousHallName = student.hall?.shortName ?? "Hall";
    const previousRoomNumber = student.room.roomNumber;
    const updatedStudent = await prisma_1.prisma.$transaction(async (tx) => {
        const decremented = Math.max(0, student.room.occupiedCount - 1);
        await tx.room.update({
            where: { id: student.roomId },
            data: {
                occupiedCount: decremented,
                status: student.room.status === enums_1.RoomStatus.MAINTENANCE
                    ? enums_1.RoomStatus.MAINTENANCE
                    : enums_1.RoomStatus.AVAILABLE,
            },
        });
        // Reject any open room change requests
        await tx.roomChangeRequest.updateMany({
            where: {
                studentId: student.id,
                status: enums_1.ApplicationStatus.PENDING,
            },
            data: {
                status: enums_1.ApplicationStatus.REJECTED,
                adminNote: "Automatically closed because student cancelled hall seat.",
                reviewedAt: new Date(),
            },
        });
        return tx.student.update({
            where: { id: student.id },
            data: {
                isResident: false,
                hallId: null,
                roomId: null,
            },
        });
    });
    await sendSeatStatusEmail({
        to: student.email,
        subject: "DIU Smart Hall - Seat Cancellation Confirmed",
        heading: "Hall Seat Cancellation Confirmed",
        statusType: "WARNING",
        name: student.name,
        message: "Your hall seat has been vacated and cancelled as requested. Thank you for staying with DIU Smart Hall.",
        details: [
            { label: "Vacated Hall", value: previousHallName },
            { label: "Vacated Room", value: previousRoomNumber },
            ...(payload.reason
                ? [{ label: "Reason", value: payload.reason.trim() }]
                : []),
        ],
    });
    return updatedStudent;
};
const cancelSeatByAdmin = async (studentId, payload) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { id: studentId },
        include: {
            hall: true,
            room: true,
        },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    if (!student.isResident || !student.roomId || !student.room) {
        throw new Error("This student does not currently occupy any hall seat.");
    }
    const previousHallName = student.hall?.shortName ?? "Hall";
    const previousRoomNumber = student.room.roomNumber;
    const updatedStudent = await prisma_1.prisma.$transaction(async (tx) => {
        const decremented = Math.max(0, student.room.occupiedCount - 1);
        await tx.room.update({
            where: { id: student.roomId },
            data: {
                occupiedCount: decremented,
                status: student.room.status === enums_1.RoomStatus.MAINTENANCE
                    ? enums_1.RoomStatus.MAINTENANCE
                    : enums_1.RoomStatus.AVAILABLE,
            },
        });
        await tx.roomChangeRequest.updateMany({
            where: {
                studentId: student.id,
                status: enums_1.ApplicationStatus.PENDING,
            },
            data: {
                status: enums_1.ApplicationStatus.REJECTED,
                adminNote: "Automatically closed upon administrative seat cancellation.",
                reviewedAt: new Date(),
            },
        });
        return tx.student.update({
            where: { id: student.id },
            data: {
                isResident: false,
                hallId: null,
                roomId: null,
            },
        });
    });
    await sendSeatStatusEmail({
        to: student.email,
        subject: "DIU Smart Hall - Notice of Seat Cancellation",
        heading: "Your Hall Seat Has Been Cancelled",
        statusType: "DANGER",
        name: student.name,
        message: "Your residential seat allocation has been cancelled by the Hall Administration.",
        details: [
            { label: "Hall", value: previousHallName },
            { label: "Room", value: previousRoomNumber },
            ...(payload.reason
                ? [{ label: "Administrative Reason", value: payload.reason.trim() }]
                : []),
        ],
    });
    return updatedStudent;
};
// 6. SMART ANALYTICS DASHBOARD
const getSeatAnalytics = async () => {
    const [pendingApplicationsByGender, pendingRoomChanges, rooms, residentsByDepartment,] = await Promise.all([
        prisma_1.prisma.seatApplication.groupBy({
            by: ["gender"],
            where: { status: enums_1.ApplicationStatus.PENDING },
            _count: { id: true },
        }),
        prisma_1.prisma.roomChangeRequest.count({
            where: { status: enums_1.ApplicationStatus.PENDING },
        }),
        prisma_1.prisma.room.findMany({
            where: { hall: { isActive: true } },
            select: {
                capacity: true,
                occupiedCount: true,
                status: true,
            },
        }),
        prisma_1.prisma.student.groupBy({
            by: ["department"],
            where: {
                isResident: true,
                isDeleted: false,
            },
            _count: { id: true },
        }),
    ]);
    let totalCapacity = 0;
    let totalOccupied = 0;
    let availableSeats = 0;
    let maintenanceRooms = 0;
    for (const room of rooms) {
        totalCapacity += room.capacity;
        totalOccupied += room.occupiedCount;
        if (room.status === enums_1.RoomStatus.MAINTENANCE) {
            maintenanceRooms += 1;
        }
        else {
            availableSeats += Math.max(0, room.capacity - room.occupiedCount);
        }
    }
    return {
        seatSummary: {
            totalCapacity,
            totalOccupied,
            availableSeats,
            maintenanceRooms,
            occupancyRate: totalCapacity > 0
                ? Number(((totalOccupied / totalCapacity) * 100).toFixed(2))
                : 0,
        },
        pendingQueue: {
            seatApplicationsByGender: pendingApplicationsByGender.map((g) => ({
                gender: g.gender,
                count: g._count.id,
            })),
            pendingRoomChangeRequests: pendingRoomChanges,
        },
        departmentDistribution: residentsByDepartment
            .map((d) => ({
            department: d.department ?? "UNSPECIFIED",
            residentCount: d._count.id,
        }))
            .sort((a, b) => b.residentCount - a.residentCount),
    };
};
// 1. STUDENT: Withdraw/Cancel Pending Room Change Request
const cancelMyRoomChangeRequest = async (userId, requestId) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { userId },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    const request = await prisma_1.prisma.roomChangeRequest.findUnique({
        where: { id: requestId },
    });
    if (!request) {
        throw new Error("Room change request not found.");
    }
    if (request.studentId !== student.id) {
        throw new Error("You are not authorized to cancel this request.");
    }
    if (request.status !== enums_1.ApplicationStatus.PENDING) {
        throw new Error(`Cannot cancel a request that has already been ${request.status.toLowerCase()}.`);
    }
    return prisma_1.prisma.roomChangeRequest.update({
        where: { id: requestId },
        data: {
            status: enums_1.ApplicationStatus.CANCELLED,
        },
    });
};
// 2. ADMIN: Get All Current Hall Residents (with filters)
const getAllResidents = async (query) => {
    const whereClause = {
        isResident: true,
        isDeleted: false,
    };
    if (query.hallId) {
        whereClause.hallId = query.hallId;
    }
    if (query.roomId) {
        whereClause.roomId = query.roomId;
    }
    if (query.department) {
        whereClause.department = {
            contains: query.department,
            mode: "insensitive",
        };
    }
    if (query.floor !== undefined && !isNaN(Number(query.floor))) {
        whereClause.room = {
            floor: Number(query.floor),
        };
    }
    if (query.searchTerm) {
        whereClause.OR = [
            { name: { contains: query.searchTerm, mode: "insensitive" } },
            { studentUniId: { contains: query.searchTerm, mode: "insensitive" } },
            { email: { contains: query.searchTerm, mode: "insensitive" } },
            { contactNumber: { contains: query.searchTerm, mode: "insensitive" } },
        ];
    }
    const residents = await prisma_1.prisma.student.findMany({
        where: whereClause,
        orderBy: [{ hall: { shortName: "asc" } }, { room: { roomNumber: "asc" } }],
        select: {
            id: true,
            name: true,
            email: true,
            studentUniId: true,
            department: true,
            gender: true,
            contactNumber: true,
            parentPhoneNumber: true,
            warningCount: true,
            user: {
                select: {
                    imageUrl: true,
                },
            },
            hall: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                },
            },
            room: {
                select: {
                    id: true,
                    roomNumber: true,
                    floor: true,
                    capacity: true,
                    occupiedCount: true,
                },
            },
        },
    });
    return {
        totalResidents: residents.length,
        residents,
    };
};
// 3. STUDENT: Get Complete Seat & Room Change Timeline History
const getMySeatHistory = async (userId) => {
    const student = await prisma_1.prisma.student.findUnique({
        where: { userId },
        include: {
            hall: { select: { id: true, name: true, shortName: true } },
            room: { select: { id: true, roomNumber: true, floor: true } },
        },
    });
    if (!student || student.isDeleted) {
        throw new Error("Student profile not found.");
    }
    const [applications, roomChanges] = await Promise.all([
        prisma_1.prisma.seatApplication.findMany({
            where: { studentId: student.id },
            orderBy: { createdAt: "desc" },
            include: {
                allocatedHall: {
                    select: { id: true, name: true, shortName: true, monthlyFee: true },
                },
                allocatedRoom: {
                    select: { id: true, roomNumber: true, floor: true },
                },
            },
        }),
        prisma_1.prisma.roomChangeRequest.findMany({
            where: { studentId: student.id },
            orderBy: { createdAt: "desc" },
            include: {
                currentRoom: {
                    select: {
                        roomNumber: true,
                        floor: true,
                        hall: { select: { name: true, shortName: true } },
                    },
                },
                targetHall: { select: { id: true, name: true, shortName: true } },
                targetRoom: { select: { id: true, roomNumber: true, floor: true } },
            },
        }),
    ]);
    return {
        currentStatus: {
            isResident: student.isResident,
            currentHall: student.hall,
            currentRoom: student.room,
        },
        seatApplications: applications,
        roomChangeHistory: roomChanges,
    };
};
exports.SeatService = {
    applyForSeat,
    getMySeatApplications,
    cancelMySeatApplication,
    getMyCurrentSeat,
    getAllSeatApplications,
    getRecommendedRoomsForApplication,
    approveSeatApplication,
    rejectSeatApplication,
    directAllocateSeat,
    requestRoomChange,
    getMyRoomChangeRequests,
    getAllRoomChangeRequests,
    approveRoomChange,
    rejectRoomChange,
    cancelSeatByStudent,
    cancelSeatByAdmin,
    getSeatAnalytics,
    cancelMyRoomChangeRequest,
    getAllResidents,
    getMySeatHistory,
};
