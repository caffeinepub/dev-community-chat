import type { backendInterface } from "../backend";
import type { backendInterface as FullBackendInterface } from "../backend.d";
import { createActorWithConfig } from "../config";

let _instance: backendInterface | null = null;
let _loading: Promise<backendInterface> | null = null;

async function getInstance(): Promise<backendInterface> {
  if (_instance) return _instance;
  if (_loading) return _loading;
  _loading = createActorWithConfig().then((actor) => {
    _instance = actor;
    _loading = null;
    return actor;
  });
  return _loading;
}

// Reset instance (e.g. after identity change)
export function resetBackendInstance() {
  _instance = null;
  _loading = null;
}

export const backendService = {
  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<void> {
    const actor = await getInstance();
    return actor.register(username, email, password);
  },
  async login(username: string, password: string): Promise<string> {
    const actor = await getInstance();
    return actor.login(username, password);
  },
  async logout(token: string): Promise<void> {
    const actor = await getInstance();
    return actor.logout(token);
  },
  async getAllGroups() {
    const actor = await getInstance();
    return actor.getAllGroups();
  },
  async getAllUsers() {
    const actor = await getInstance();
    return actor.getAllUsers();
  },
  async getMessages(groupId: string, since: bigint | null) {
    const actor = await getInstance();
    return actor.getMessages(groupId, since);
  },
  async sendMessage(
    groupId: string,
    text: string,
    sessionToken: string,
  ): Promise<bigint> {
    const actor = await getInstance();
    return actor.sendMessage(groupId, text, sessionToken);
  },
  async validateSessionToken(token: string): Promise<boolean> {
    const actor = await getInstance();
    return actor.validateSessionToken(token);
  },
  async createArticle(
    sessionToken: string,
    title: string,
    content: string,
    imageUrl: string | null,
  ): Promise<bigint> {
    const actor = (await getInstance()) as unknown as FullBackendInterface;
    return actor.createArticle(sessionToken, title, content, imageUrl);
  },
  async getAllArticles() {
    const actor = (await getInstance()) as unknown as FullBackendInterface;
    return actor.getAllArticles();
  },
  async getArticle(id: bigint) {
    const actor = (await getInstance()) as unknown as FullBackendInterface;
    return actor.getArticle(id);
  },
  async updateArticle(
    sessionToken: string,
    id: bigint,
    title: string,
    content: string,
    imageUrl: string | null,
  ): Promise<void> {
    const actor = (await getInstance()) as unknown as FullBackendInterface;
    return actor.updateArticle(sessionToken, id, title, content, imageUrl);
  },
  async deleteArticle(sessionToken: string, id: bigint): Promise<void> {
    const actor = (await getInstance()) as unknown as FullBackendInterface;
    return actor.deleteArticle(sessionToken, id);
  },
};
