export const SYNCIO_COMPANION_CONTRACT_VERSION = 1 as const;
export const SYNCIO_COMPLETION_THRESHOLD = 80;

export type SyncioCompanionScope =
	| 'status:read'
	| 'history:preview'
	| 'history:submit'
	| 'scrobble:write';

export type SyncioMediaType = 'movie' | 'episode';

export interface SyncioObservation {
	contractVersion: typeof SYNCIO_COMPANION_CONTRACT_VERSION;
	provider: string;
	sourceItemId: string;
	sourceShowId: string | null;
	mediaType: SyncioMediaType;
	title: string;
	year: number | null;
	showTitle: string | null;
	season: number | null;
	episode: number | null;
	absoluteEpisode: number | null;
	progressPercent: number | null;
	platformMarkedCompleted: boolean | null;
	watchedAt: string | null;
	durationSeconds: number | null;
}

export interface SyncioPairingResult {
	contractVersion: typeof SYNCIO_COMPANION_CONTRACT_VERSION;
	client: {
		id: string;
		label: string;
		scopes: SyncioCompanionScope[];
	};
	token: string;
}

export interface SyncioStatus {
	contractVersion: typeof SYNCIO_COMPANION_CONTRACT_VERSION;
	client: {
		id: string;
		label: string;
		scopes: SyncioCompanionScope[];
		createdAt: string;
		lastSeenAt: string;
	};
	historyImport: {
		mode: 'read-only-preview';
		completionThreshold: number;
		browserNavigationHistory: 'not-read';
	};
}

export type SyncioObservationDisposition = 'candidate' | 'review' | 'excluded';

export interface SyncioObservationPreview {
	contractVersion: typeof SYNCIO_COMPANION_CONTRACT_VERSION;
	apply: false;
	completionThreshold: number;
	counts: Record<SyncioObservationDisposition, number>;
	items: {
		sourceItemId: string;
		disposition: SyncioObservationDisposition;
		reason: string;
	}[];
}
