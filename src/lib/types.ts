export type RoomSummary = {
  id: string;
  name: string;
  createdAt: string;
};

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
  createdAt: string;
  likeCount: number;
  liked: boolean;
  canDelete: boolean;
  comments: PinComment[];
};

export type RoomState = {
  room: RoomSummary;
  pins: Pin[];
};

export type PlaceSearchResult = {
  kakaoPlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string | null;
};
