export type RoomSummary = {
  id: string;
  name: string;
  createdAt: string;
  expiresAt: string;
};

export type RoomAccessMode = "edit" | "read";

export type PinStatus = "want" | "hold" | "rejected" | "confirmed";

export type PriceLevel = "cheap" | "moderate" | "expensive";

export type PinComment = {
  id: string;
  pinId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type Pin = {
  id: string;
  kakaoPlaceId: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string | null;
  status: PinStatus;
  note: string;
  priceLevel: PriceLevel | null;
  createdAt: string;
  likeCount: number;
  liked: boolean;
  isMine: boolean;
  canDelete: boolean;
  deletedAt: string | null;
  comments: PinComment[];
};

export type Participant = {
  clientId: string;
  authorName: string;
  color: string;
  lastSeenAt: string;
};

export type RoomEvent = {
  id: number;
  type: "pin_added" | "pin_updated" | "pin_deleted" | "pin_restored" | "comment_added" | "like_changed";
  pinId: string | null;
  actorName: string;
  createdAt: string;
};

export type RoomState = {
  room: RoomSummary;
  accessMode: RoomAccessMode;
  readOnly: boolean;
  pins: Pin[];
  participants: Participant[];
  onlineParticipants: Participant[];
  events: RoomEvent[];
};

export type PlaceSearchResult = {
  kakaoPlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string | null;
};
