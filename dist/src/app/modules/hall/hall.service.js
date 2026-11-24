import { RoomStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
const formatRoomNumber = (floor, roomIndex) => {
    if (floor === 0) {
        return `0${roomIndex}`;
    }
    return `${floor}${String(roomIndex).padStart(2, "0")}`;
};
const createHall = async (payload) => {
    const existingHall = await prisma.hall.findFirst({
        where: {
            OR: [{ name: payload.name }, { shortName: payload.shortName }],
        },
    });
    if (existingHall) {
        throw new Error("A hall with this name or short name already exists.");
    }
    const hall = await prisma.hall.create({
        data: {
            name: payload.name,
            shortName: payload.shortName.toUpperCase(),
            genderType: payload.genderType,
            totalFloors: payload.totalFloors,
            roomsPerFloor: payload.roomsPerFloor,
            defaultRoomCapacity: payload.defaultRoomCapacity ?? 4,
            monthlyFee: payload.monthlyFee ?? 0,
        },
    });
    return hall;
};
const getAllHalls = async (query) => {
    const whereClause = {};
    if (query.genderType) {
        whereClause.genderType = query.genderType;
    }
    if (typeof query.isActive === "boolean") {
        whereClause.isActive = query.isActive;
    }
    const halls = await prisma.hall.findMany({
        where: whereClause,
        orderBy: { createdAt: "asc" },
        include: {
            rooms: {
                select: {
                    capacity: true,
                    occupiedCount: true,
                    status: true,
                },
            },
        },
    });
    return halls.map((hall) => {
        const totalRooms = hall.rooms.length;
        const totalCapacity = hall.rooms.reduce((sum, r) => sum + r.capacity, 0);
        const occupiedSeats = hall.rooms.reduce((sum, r) => sum + r.occupiedCount, 0);
        const availableSeats = totalCapacity - occupiedSeats;
        const { rooms: _rooms, ...hallInfo } = hall;
        return {
            ...hallInfo,
            stats: {
                totalRooms,
                totalCapacity,
                occupiedSeats,
                availableSeats,
            },
        };
    });
};
const getSingleHall = async (hallId) => {
    const hall = await prisma.hall.findUnique({
        where: { id: hallId },
        include: {
            rooms: {
                orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
            },
        },
    });
    if (!hall) {
        throw new Error("Hall not found.");
    }
    return hall;
};
const updateHall = async (hallId, payload) => {
    const existingHall = await prisma.hall.findUnique({
        where: { id: hallId },
    });
    if (!existingHall) {
        throw new Error("Hall not found.");
    }
    const updateData = { ...payload };
    if (payload.shortName) {
        updateData.shortName = payload.shortName.toUpperCase();
    }
    const updatedHall = await prisma.hall.update({
        where: { id: hallId },
        data: updateData,
    });
    return updatedHall;
};
const createSingleRoom = async (payload) => {
    const hall = await prisma.hall.findUnique({
        where: { id: payload.hallId },
    });
    if (!hall) {
        throw new Error("Selected hall does not exist.");
    }
    if (payload.floor > hall.totalFloors) {
        throw new Error(`Invalid floor! ${hall.shortName} only has ${hall.totalFloors} floors (0 to ${hall.totalFloors}).`);
    }
    // Validate roomNumber format & floor alignment
    const trimmedRoomNumber = payload.roomNumber.trim();
    const minRoom = formatRoomNumber(payload.floor, 1);
    const maxRoom = formatRoomNumber(payload.floor, hall.roomsPerFloor);
    if (payload.floor === 0) {
        if (!/^0[1-9]\d*$/.test(trimmedRoomNumber)) {
            throw new Error(`Invalid room number '${trimmedRoomNumber}' for Ground Floor (floor 0). Expected format: ${minRoom} to ${maxRoom}.`);
        }
        const roomIndex = Number(trimmedRoomNumber.slice(1));
        if (roomIndex < 1 || roomIndex > hall.roomsPerFloor) {
            throw new Error(`Room number '${trimmedRoomNumber}' is out of range for Ground Floor. Valid range: ${minRoom} to ${maxRoom}.`);
        }
    }
    else {
        const floorPrefix = String(payload.floor);
        if (!trimmedRoomNumber.startsWith(floorPrefix) ||
            trimmedRoomNumber.length < floorPrefix.length + 2) {
            throw new Error(`Room number '${trimmedRoomNumber}' does not match floor ${payload.floor}. Valid range for floor ${payload.floor}: ${minRoom} to ${maxRoom}.`);
        }
        const roomIndex = Number(trimmedRoomNumber.slice(floorPrefix.length));
        if (Number.isNaN(roomIndex) ||
            roomIndex < 1 ||
            roomIndex > hall.roomsPerFloor) {
            throw new Error(`Room number '${trimmedRoomNumber}' is out of range for floor ${payload.floor}. Valid range: ${minRoom} to ${maxRoom}.`);
        }
    }
    const existingRoom = await prisma.room.findUnique({
        where: {
            uq_hall_roomNumber: {
                hallId: payload.hallId,
                roomNumber: trimmedRoomNumber,
            },
        },
    });
    if (existingRoom) {
        throw new Error(`Room ${trimmedRoomNumber} already exists in ${hall.shortName}.`);
    }
    const room = await prisma.room.create({
        data: {
            hallId: payload.hallId,
            roomNumber: trimmedRoomNumber,
            floor: payload.floor,
            capacity: payload.capacity ?? hall.defaultRoomCapacity,
        },
    });
    return room;
};
const bulkGenerateRooms = async (payload) => {
    const hall = await prisma.hall.findUnique({
        where: { id: payload.hallId },
    });
    if (!hall) {
        throw new Error("Selected hall does not exist.");
    }
    if (payload.endFloor > hall.totalFloors) {
        throw new Error(`End floor (${payload.endFloor}) exceeds ${hall.shortName}'s total floors (${hall.totalFloors}).`);
    }
    const roomCapacity = payload.capacity ?? hall.defaultRoomCapacity;
    const roomsToCreate = [];
    for (let floor = payload.startFloor; floor <= payload.endFloor; floor++) {
        // Skip floor 1 if building jumps directly from Ground Floor (0) to 2nd Floor (2)
        // when startFloor === 0 and endFloor >= 2
        if (payload.startFloor === 0 && floor === 1) {
            continue;
        }
        for (let roomIdx = 1; roomIdx <= payload.roomsPerFloor; roomIdx++) {
            roomsToCreate.push({
                hallId: hall.id,
                roomNumber: formatRoomNumber(floor, roomIdx),
                floor,
                capacity: roomCapacity,
            });
        }
    }
    const result = await prisma.room.createMany({
        data: roomsToCreate,
        skipDuplicates: true,
    });
    return {
        hallName: hall.name,
        shortName: hall.shortName,
        createdCount: result.count,
        attemptedCount: roomsToCreate.length,
    };
};
const getAllRooms = async (query) => {
    if (typeof query.floor === "number") {
        if (Number.isNaN(query.floor) || query.floor < 0) {
            throw new Error("Floor number must be 0 or a positive integer.");
        }
    }
    if (query.hallId) {
        const hall = await prisma.hall.findUnique({
            where: { id: query.hallId },
            select: { id: true, shortName: true, totalFloors: true },
        });
        if (!hall) {
            throw new Error("Hall not found.");
        }
        if (typeof query.floor === "number" && query.floor > hall.totalFloors) {
            throw new Error(`Invalid floor! ${hall.shortName} only has ${hall.totalFloors} floors (0 to ${hall.totalFloors}).`);
        }
    }
    const whereClause = {};
    if (query.hallId) {
        whereClause.hallId = query.hallId;
    }
    if (typeof query.floor === "number") {
        whereClause.floor = query.floor;
    }
    if (query.status) {
        whereClause.status = query.status;
    }
    if (query.genderType) {
        whereClause.hall = {
            genderType: query.genderType,
            isActive: true,
        };
    }
    const rooms = await prisma.room.findMany({
        where: whereClause,
        orderBy: [
            { hall: { shortName: "asc" } },
            { floor: "asc" },
            { roomNumber: "asc" },
        ],
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
                    id: true,
                    name: true,
                    studentUniId: true,
                    department: true,
                    contactNumber: true,
                },
            },
        },
    });
    return rooms;
};
const updateRoom = async (roomId, payload) => {
    const room = await prisma.room.findUnique({
        where: { id: roomId },
    });
    if (!room) {
        throw new Error("Room not found.");
    }
    const nextCapacity = payload.capacity ?? room.capacity;
    if (room.occupiedCount > nextCapacity) {
        throw new Error(`Cannot reduce capacity to ${nextCapacity} because ${room.occupiedCount} students currently occupy this room.`);
    }
    let nextStatus = payload.status ?? room.status;
    if (nextStatus !== RoomStatus.MAINTENANCE) {
        nextStatus =
            room.occupiedCount >= nextCapacity
                ? RoomStatus.FULL
                : RoomStatus.AVAILABLE;
    }
    const updatedRoom = await prisma.room.update({
        where: { id: roomId },
        data: {
            capacity: nextCapacity,
            status: nextStatus,
        },
    });
    return updatedRoom;
};
export const HallServices = {
    createHall,
    getAllHalls,
    getSingleHall,
    updateHall,
    createSingleRoom,
    bulkGenerateRooms,
    getAllRooms,
    updateRoom,
};
