import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Message {
    id: bigint;
    text: string;
    senderUsername: string;
    groupId: string;
    timestamp: Time;
    senderId: Principal;
}
export interface PublicUserProfile {
    username: string;
    email: string;
    lastSeen: Time;
    online: boolean;
}
export type Time = bigint;
export interface GroupView {
    id: string;
    name: string;
    memberCount: bigint;
    description: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createGroup(id: string, name: string, description: string): Promise<void>;
    getAllGroups(): Promise<Array<GroupView>>;
    getAllUsers(): Promise<Array<PublicUserProfile>>;
    getCallerUserProfile(): Promise<PublicUserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGroup(id: string): Promise<GroupView>;
    getMessages(groupId: string, since: Time | null): Promise<Array<Message>>;
    getUserProfile(user: Principal): Promise<PublicUserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    joinGroup(groupId: string): Promise<void>;
    login(username: string, password: string): Promise<string>;
    logout(token: string): Promise<void>;
    register(username: string, email: string, password: string): Promise<void>;
    saveCallerUserProfile(username: string, email: string): Promise<void>;
    sendMessage(groupId: string, text: string, sessionToken: string): Promise<bigint>;
    validateSessionToken(token: string): Promise<boolean>;
}
