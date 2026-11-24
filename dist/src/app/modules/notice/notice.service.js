import { prisma } from "../../lib/prisma";
// 1. Create Notice (Global when hallId is null, or Hall-Specific when hallId is provided)
const createNotice = async (adminUserId, payload) => {
    if (payload.hallId) {
        const hall = await prisma.hall.findUnique({
            where: { id: payload.hallId },
            select: { id: true, isActive: true },
        });
        if (!hall || !hall.isActive) {
            throw new Error("Target hall does not exist or is currently inactive.");
        }
    }
    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
    if (expiresAt && expiresAt <= new Date()) {
        throw new Error("Notice expiration date must be in the future.");
    }
    return prisma.notice.create({
        data: {
            title: payload.title,
            content: payload.content,
            category: payload.category ?? "GENERAL",
            priority: payload.priority ?? "NORMAL",
            isPinned: payload.isPinned ?? false,
            hallId: payload.hallId ?? null,
            attachments: (payload.attachments ?? []),
            expiresAt,
            createdById: adminUserId,
        },
        include: {
            hall: { select: { id: true, name: true, shortName: true, genderType: true } },
            createdBy: { select: { id: true, name: true, role: true } },
        },
    });
};
/**
 * 2. Get Active Notices (Public Feed for All Students & Visitors)
 */
const getStudentNotices = async (filters) => {
    const now = new Date();
    const andConditions = [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ];
    if (filters.hallId) {
        andConditions.push({
            OR: [{ hallId: null }, { hallId: filters.hallId }],
        });
    }
    if (filters.category) {
        andConditions.push({ category: filters.category });
    }
    if (filters.priority) {
        andConditions.push({ priority: filters.priority });
    }
    if (filters.searchTerm) {
        andConditions.push({
            OR: [
                { title: { contains: filters.searchTerm, mode: "insensitive" } },
                { content: { contains: filters.searchTerm, mode: "insensitive" } },
            ],
        });
    }
    return prisma.notice.findMany({
        where: { AND: andConditions },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: {
            hall: { select: { id: true, name: true, shortName: true, genderType: true } },
            createdBy: { select: { id: true, name: true, role: true } },
        },
    });
};
// 3. Get All Notices for Admin Management
const getAllNoticesForAdmin = async (filters) => {
    const now = new Date();
    const andConditions = [];
    if (filters.hallId) {
        andConditions.push({ hallId: filters.hallId });
    }
    if (filters.category) {
        andConditions.push({ category: filters.category });
    }
    if (filters.priority) {
        andConditions.push({ priority: filters.priority });
    }
    if (filters.includeExpired !== "true") {
        andConditions.push({
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        });
    }
    if (filters.searchTerm) {
        andConditions.push({
            OR: [
                { title: { contains: filters.searchTerm, mode: "insensitive" } },
                { content: { contains: filters.searchTerm, mode: "insensitive" } },
            ],
        });
    }
    return prisma.notice.findMany({
        where: andConditions.length ? { AND: andConditions } : {},
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: {
            hall: { select: { id: true, name: true, shortName: true, genderType: true } },
            createdBy: { select: { id: true, name: true, role: true } },
        },
    });
};
// 4. Update Notice (Pin/Unpin, Edit Content, Replace Attachments, or Extend Expiry)
const updateNotice = async (noticeId, payload) => {
    const existing = await prisma.notice.findUnique({ where: { id: noticeId } });
    if (!existing) {
        throw new Error("Notice not found.");
    }
    const updateData = {};
    if (payload.title !== undefined)
        updateData.title = payload.title;
    if (payload.content !== undefined)
        updateData.content = payload.content;
    if (payload.category !== undefined)
        updateData.category = payload.category;
    if (payload.priority !== undefined)
        updateData.priority = payload.priority;
    if (payload.isPinned !== undefined)
        updateData.isPinned = payload.isPinned;
    if (payload.attachments !== undefined) {
        updateData.attachments = payload.attachments;
    }
    if (payload.hallId !== undefined) {
        updateData.hall = payload.hallId
            ? { connect: { id: payload.hallId } }
            : { disconnect: true };
    }
    if (payload.expiresAt !== undefined) {
        updateData.expiresAt = payload.expiresAt
            ? new Date(payload.expiresAt)
            : null;
    }
    return prisma.notice.update({
        where: { id: noticeId },
        data: updateData,
        include: {
            hall: { select: { id: true, name: true, shortName: true, genderType: true } },
            createdBy: { select: { id: true, name: true, role: true } },
        },
    });
};
// 5. Manual Deletion of Single Notice (Admin)
const deleteNotice = async (noticeId) => {
    const existing = await prisma.notice.findUnique({ where: { id: noticeId } });
    if (!existing) {
        throw new Error("Notice not found.");
    }
    return prisma.notice.delete({ where: { id: noticeId } });
};
// 6. Automated/Scheduled Bulk Purge of Expired Notices (Admin)
const purgeExpiredNotices = async () => {
    const result = await prisma.notice.deleteMany({
        where: {
            expiresAt: { lt: new Date() },
        },
    });
    return { deletedCount: result.count };
};
export const NoticeService = {
    createNotice,
    getStudentNotices,
    getAllNoticesForAdmin,
    updateNotice,
    deleteNotice,
    purgeExpiredNotices,
};
