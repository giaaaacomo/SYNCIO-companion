import {
	SYNCIO_COMPANION_CONTRACT_VERSION,
	SyncioObservation,
	SyncioObservationPreview,
} from './contracts';
import { SyncioClient } from './SyncioClient';
import { getServiceApi } from '@apis/ServiceApi';
import { ScrobbleItem } from '@models/Item';
import { getSyncStore } from '@stores/SyncStore';

export const SYNCIO_NATIVE_HISTORY_SERVICES = ['netflix', 'amazon-prime', 'crunchyroll'] as const;

export type SyncioNativeHistoryService = (typeof SYNCIO_NATIVE_HISTORY_SERVICES)[number];

export interface SyncioHistoryScanProgress {
	fetched: number;
	previewed: number;
	batches: number;
	counts: SyncioObservationPreview['counts'];
}

export interface SyncioHistoryScanResult extends SyncioHistoryScanProgress {
	serviceId: SyncioNativeHistoryService;
	items: SyncioObservationPreview['items'];
}

export function toSyncioObservation(item: ScrobbleItem): SyncioObservation {
	const isEpisode = item.type === 'episode';
	const watchedAt =
		typeof item.watchedAt === 'number' && Number.isFinite(item.watchedAt) && item.watchedAt > 0
			? new Date(item.watchedAt * 1000).toISOString()
			: null;
	const evidence = item.sourceCompletionEvidence;
	const progressPercent =
		evidence?.progressReliable !== false &&
		typeof item.progress === 'number' &&
		Number.isFinite(item.progress)
			? Math.max(0, Math.min(100, item.progress))
			: null;

	return {
		contractVersion: SYNCIO_COMPANION_CONTRACT_VERSION,
		provider: item.serviceId,
		sourceItemId: item.id.slice(0, 200),
		sourceShowId: isEpisode ? item.show.id.slice(0, 200) : null,
		mediaType: item.type,
		title: item.title.slice(0, 300),
		year: item.year >= 1870 && item.year <= 2200 ? item.year : null,
		showTitle: isEpisode ? item.show.title.slice(0, 300) : null,
		season: isEpisode ? item.season : null,
		episode: isEpisode ? item.number : null,
		absoluteEpisode: isEpisode && item.isAbsolute ? item.number : null,
		progressPercent,
		platformMarkedCompleted: evidence?.platformMarkedCompleted ?? null,
		watchedAt,
		durationSeconds: null,
	};
}

export async function previewNativeHistory(
	serviceId: SyncioNativeHistoryService,
	options: {
		since?: Date | null;
		onProgress?: (progress: SyncioHistoryScanProgress) => void;
		maxBatches?: number;
	} = {}
): Promise<SyncioHistoryScanResult> {
	const client = await SyncioClient.fromStorage();
	if (!client) throw new Error('Connect SYNCIO before scanning streaming history.');

	const api = getServiceApi(serviceId);
	if (!(await api.checkLogin())) {
		throw new Error('Sign in to the streaming service in this browser, then try again.');
	}

	const store = getSyncStore(serviceId);
	api.reset();
	await store.resetData();

	const cutoff = options.since ? Math.floor(options.since.getTime() / 1000) : 0;
	const maxBatches = options.maxBatches ?? 100;
	let pages = 0;
	const result: SyncioHistoryScanResult = {
		serviceId,
		fetched: 0,
		previewed: 0,
		batches: 0,
		counts: { candidate: 0, review: 0, excluded: 0 },
		items: [],
	};

	while (!store.data.hasReachedEnd && pages < maxBatches) {
		const items = await api.loadHistory(100, 0, '', 'syncio-history-preview');
		pages += 1;
		if (items.length === 0 && !store.data.hasReachedEnd) {
			throw new Error('The streaming service returned an empty page before reaching the end.');
		}
		result.fetched += items.length;
		const observations = items
			.filter((item) => !cutoff || (item.watchedAt ?? 0) >= cutoff)
			.map(toSyncioObservation);
		if (observations.length > 0) {
			const preview = await client.previewHistory(observations);
			result.previewed += observations.length;
			result.batches += 1;
			result.counts.candidate += preview.counts.candidate;
			result.counts.review += preview.counts.review;
			result.counts.excluded += preview.counts.excluded;
			result.items.push(...preview.items);
		}
		options.onProgress?.({
			fetched: result.fetched,
			previewed: result.previewed,
			batches: result.batches,
			counts: { ...result.counts },
		});
	}

	if (!store.data.hasReachedEnd) {
		throw new Error(`History preview stopped after ${maxBatches} service pages.`);
	}
	return result;
}
