import { SyncioCompanionScope } from './contracts';
import browser from 'webextension-polyfill';

const CONNECTION_KEY = 'syncioConnection';

export interface SyncioConnection {
	workerUrl: string;
	token: string;
	client: {
		id: string;
		label: string;
		scopes: SyncioCompanionScope[];
	};
	connectedAt: string;
}

class _SyncioStorage {
	async getConnection(): Promise<SyncioConnection | null> {
		const values = (await browser.storage.local.get(CONNECTION_KEY)) as {
			syncioConnection?: unknown;
		};
		return parseConnection(values.syncioConnection);
	}

	async setConnection(connection: SyncioConnection): Promise<void> {
		await browser.storage.local.set({ [CONNECTION_KEY]: connection });
	}

	async clearConnection(): Promise<void> {
		await browser.storage.local.remove(CONNECTION_KEY);
	}
}

function parseConnection(value: unknown): SyncioConnection | null {
	if (!isRecord(value)) return null;
	if (
		typeof value.workerUrl !== 'string' ||
		typeof value.token !== 'string' ||
		typeof value.connectedAt !== 'string' ||
		!isRecord(value.client) ||
		typeof value.client.id !== 'string' ||
		typeof value.client.label !== 'string' ||
		!Array.isArray(value.client.scopes) ||
		!value.client.scopes.every((scope) => typeof scope === 'string')
	) {
		return null;
	}
	return value as unknown as SyncioConnection;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

export const SyncioStorage = new _SyncioStorage();
