import type { Gender, RoomStatus } from "../../../generated/prisma/enums";

export interface ICreateHallPayload {
  name: string;
  shortName: string;
  genderType: Gender;
  totalFloors: number;
  roomsPerFloor: number;
  defaultRoomCapacity?: number;
  monthlyFee?: number;
}

export interface IUpdateHallPayload {
  name?: string;
  shortName?: string;
  totalFloors?: number;
  roomsPerFloor?: number;
  defaultRoomCapacity?: number;
  monthlyFee?: number;
  isActive?: boolean;
}

export interface IHallFilterQuery {
  genderType?: Gender;
  isActive?: boolean;
}

export interface ICreateSingleRoomPayload {
  hallId: string;
  roomNumber: string;
  floor: number;
  capacity?: number;
}

export interface IBulkGenerateRoomsPayload {
  hallId: string;
  startFloor: number;
  endFloor: number;
  roomsPerFloor: number;
  capacity?: number;
}

export interface IUpdateRoomPayload {
  capacity?: number;
  status?: RoomStatus;
}

export interface IRoomFilterQuery {
  hallId?: string;
  floor?: number;
  status?: RoomStatus;
  genderType?: Gender;
}
