import {
	SYNCIO_COMPANION_CONTRACT_VERSION,
	SyncioObservation,
	SyncioObservationPreview,
	SyncioPairingResult,
	SyncioStatus,
} from './contracts';
import { SyncioConnection, SyncioStorage } from './SyncioStorage';
import browser from 'webextension-polyfill';

type Fetcher = typeof fetch;

export class SyncioClient {
	readonly workerUrl: string;
	private readonly token: string | null;
	private readonly fetcher: Fetcher;

	private constructor(workerUrl: string, token: string | null, fetcher: Fetcher) {
		this.workerUrl = workerUrl;
		this.token = token;
		this.fetcher = fetcher;
	}

	static async pair(
		workerUrl: string,
		code: string,
		label: string,
		fetcher: Fetcher = fetch
	): Promise<SyncioConnection> {
		const normalizedUrl = normalizeWorkerUrl(workerUrl);
		await requestWorkerPermission(normalizedUrl);
		const client = new SyncioClient(normalizedUrl, null, fetcher);
		const paired = parsePairingResult(
			await client.requestJson('/api/companion/pair', {
				method: 'POST',
				body: { code, label },
			})
		);
		const connection: SyncioConnection = {
			workerUrl: normalizedUrl,
			token: paired.token,
			client: paired.client,
			connectedAt: new Date().toISOString(),
		};
		await SyncioStorage.setConnection(connection);
		return connection;
	}

	static async fromStorage(fetcher: Fetcher = fetch): Promise<SyncioClient | null> {
		const connection = await SyncioStorage.getConnection();
		return connection ? new SyncioClient(connection.workerUrl, connection.token, fetcher) : null;
	}

	async status(): Promise<SyncioStatus> {
		return this.requestJson('/api/companion/status', { method: 'GET' }) as Promise<SyncioStatus>;
	}

	async previewHistory(observations: SyncioObservation[]): Promise<SyncioObservationPreview> {
		return this.requestJson('/api/companion/history/preview', {
			method: 'POST',
			body: { observations },
		}) as Promise<SyncioObservationPreview>;
	}

	async disconnect(): Promise<void> {
		try {
			await this.requestJson('/api/companion/disconnect', {
				method: 'POST',
				body: {},
			});
		} catch (error) {
			if (!(error instanceof SyncioClientError) || error.status !== 401) throw error;
		}
		await SyncioStorage.clearConnection();
		await browser.permissions.remove({ origins: [`${this.workerUrl}/*`] });
	}

	private async requestJson(
		path: string,
		options: { method: 'GET' | 'POST'; body?: unknown }
	): Promise<unknown> {
		const headers: Record<string, string> = { Accept: 'application/json' };
		if (options.body !== undefined) headers['Content-Type'] = 'application/json';
		if (this.token) headers.Authorization = `Bearer ${this.token}`;

		const response = await this.fetcher(`${this.workerUrl}${path}`, {
			method: options.method,
			headers,
			body: options.body === undefined ? undefined : JSON.stringify(options.body),
			credentials: 'omit',
			referrerPolicy: 'no-referrer',
			cache: 'no-store',
		});
		const text = await response.text();
		const value = parseJson(text);
		if (!response.ok) {
			const message =
				isRecord(value) && typeof value.error === 'string'
					? value.error
					: `SYNCIO request failed with HTTP ${response.status}.`;
			throw new SyncioClientError(message, response.status);
		}
		return value;
	}
}

export class SyncioClientError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}

export function normalizeWorkerUrl(value: string): string {
	const url = new URL(value.trim());
	const isLoopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
	if (url.protocol !== 'https:' && !(isLoopback && url.protocol === 'http:')) {
		throw new Error('SYNCIO Worker URL must use HTTPS.');
	}
	if (url.username || url.password || url.search || url.hash) {
		throw new Error('SYNCIO Worker URL is invalid.');
	}
	return url.origin;
}

async function requestWorkerPermission(workerUrl: string): Promise<void> {
	const granted = await browser.permissions.request({ origins: [`${workerUrl}/*`] });
	if (!granted) throw new Error('Permission to connect to the SYNCIO Worker was not granted.');
}

function parsePairingResult(value: unknown): SyncioPairingResult {
	if (!isRecord(value) || value.contractVersion !== SYNCIO_COMPANION_CONTRACT_VERSION) {
		throw new Error('SYNCIO returned an unsupported pairing response.');
	}
	if (
		typeof value.token !== 'string' ||
		value.token.length < 32 ||
		!isRecord(value.client) ||
		typeof value.client.id !== 'string' ||
		typeof value.client.label !== 'string' ||
		!Array.isArray(value.client.scopes) ||
		!value.client.scopes.every((scope) => typeof scope === 'string')
	) {
		throw new Error('SYNCIO returned an invalid pairing response.');
	}
	return value as unknown as SyncioPairingResult;
}

function parseJson(value: string): unknown {
	try {
		return JSON.parse(value) as unknown;
	} catch {
		throw new Error('SYNCIO returned an invalid JSON response.');
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}
