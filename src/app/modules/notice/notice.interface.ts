import {
  AttachmentType,
  NoticeCategory,
  NoticePriority,
} from "../../../generated/prisma/enums";

export interface INoticeAttachment {
  url: string;
  type: AttachmentType;
  fileName: string;
}

export interface ICreateNoticePayload {
  title: string;
  content: string;
  category?: NoticeCategory;
  priority?: NoticePriority;
  isPinned?: boolean;
  hallId?: string | null;
  attachments?: INoticeAttachment[];
  expiresAt?: string | Date | null;
}

export interface IUpdateNoticePayload {
  title?: string;
  content?: string;
  category?: NoticeCategory;
  priority?: NoticePriority;
  isPinned?: boolean;
  hallId?: string | null;
  attachments?: INoticeAttachment[];
  expiresAt?: string | Date | null;
}

export interface INoticeFilterParams {
  searchTerm?: string;
  category?: NoticeCategory;
  priority?: NoticePriority;
  hallId?: string;
  includeExpired?: string;
}