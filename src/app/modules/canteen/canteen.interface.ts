import {
  ComplaintStatus,
  FoodCategory,
  FoodOrderStatus,
  FoodPaymentMethod,
  FoodPortion,
  MealSlot,
  MenuApprovalStatus,
} from "../../../generated/prisma/enums";

export interface ICreateCanteenOwnerPayload {
  name: string;
  email: string;
  password: string;
  businessName: string;
  contactPhone: string;
  hallId: string;
}

export interface IUpsertMasterPricePayload {
  hallId: string;
  itemName: string;
  category: FoodCategory;
  portion: FoodPortion;
  maxAllowedTk: number;
  isActive?: boolean;
}

export interface IComboDetailItem {
  itemName: string;
  qty: number;
}

export interface ICreateMenuItemPayload {
  name: string;
  description?: string;
  imageUrl?: string;
  category: FoodCategory;
  portion: FoodPortion;
  price: number;
  isRegular?: boolean;
  isSpecial?: boolean;
  availableDate?: string | null;
  availableSlots: MealSlot[];
  isCombo?: boolean;
  comboDetails?: IComboDetailItem[];
  maxQuantity?: number | null;
  isAvailable?: boolean;
  masterPriceId?: string | null;
}

export interface IUpdateMenuItemPayload {
  name?: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  isRegular?: boolean;
  isSpecial?: boolean;
  availableDate?: string | null;
  availableSlots?: MealSlot[];
  maxQuantity?: number | null;
  isAvailable?: boolean;
}

export interface IReviewMenuPricePayload {
  approvalStatus: MenuApprovalStatus;
  adminNote?: string;
}

export interface ICreateFoodOrderPayload {
  mealDate: string;
  mealSlot: MealSlot;
  paymentMethod: FoodPaymentMethod;
  items: {
    menuItemId: string;
    quantity: number;
  }[];
}

export interface IRedeemFoodTokenPayload {
  qrToken?: string;
  orderCode?: string;
  pickupPin?: string;
  collectCashConfirmed?: boolean;
}

export interface IUpdateOrderStatusPayload {
  orderStatus: FoodOrderStatus;
}

export interface ICreateMealReviewPayload {
  orderId: string;
  menuItemId: string;
  rating: number;
  comment?: string;
}

export interface ICreateFoodComplaintPayload {
  orderId: string;
  title: string;
  description: string;
  evidenceUrls: string[];
}

export interface IResolveFoodComplaintPayload {
  status: ComplaintStatus;
  fineAmount?: number;
  adminNote: string;
}

export interface IUpdateCanteenOwnerStatusPayload {
  isActive: boolean;
  removeAccount?: boolean;
  reason?: string;
}