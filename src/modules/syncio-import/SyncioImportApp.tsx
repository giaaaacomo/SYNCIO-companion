import {
	previewNativeHistory,
	SYNCIO_NATIVE_HISTORY_SERVICES,
	SyncioHistoryScanProgress,
	SyncioHistoryScanResult,
	SyncioNativeHistoryService,
} from '@/syncio/observations';
import { getService } from '@models/Service';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
	Alert,
	Box,
	Button,
	Container,
	FormControl,
	InputLabel,
	LinearProgress,
	MenuItem,
	Select,
	Stack,
	Typography,
} from '@mui/material';
import { useState } from 'react';

const EMPTY_PROGRESS: SyncioHistoryScanProgress = {
	fetched: 0,
	previewed: 0,
	batches: 0,
	counts: { candidate: 0, review: 0, excluded: 0 },
};

export const SyncioImportApp = (): JSX.Element => {
	const [serviceId, setServiceId] = useState<SyncioNativeHistoryService>('netflix');
	const [range, setRange] = useState('all');
	const [isScanning, setScanning] = useState(false);
	const [progress, setProgress] = useState(EMPTY_PROGRESS);
	const [result, setResult] = useState<SyncioHistoryScanResult | null>(null);
	const [error, setError] = useState('');

	const scan = async () => {
		setScanning(true);
		setProgress(EMPTY_PROGRESS);
		setResult(null);
		setError('');
		try {
			const preview = await previewNativeHistory(serviceId, {
				since: rangeStart(range),
				onProgress: setProgress,
			});
			setResult(preview);
		} catch (scanError) {
			setError(scanError instanceof Error ? scanError.message : 'History preview failed.');
		} finally {
			setScanning(false);
		}
	};

	return (
		<Container maxWidth="md" sx={{ paddingY: 4 }}>
			<Stack spacing={4}>
				<Box component="header">
					<Typography component="h1" variant="h4">
						SYNCIO Companion
					</Typography>
					<Typography color="text.secondary">
						Preview native streaming history before importing it.
					</Typography>
				</Box>

				<Alert severity="info">
					The scan uses viewing activity from the selected streaming service. It never reads browser
					navigation history, and this preview does not write to Trakt or Stremio.
				</Alert>

				<Box component="section">
					<Typography component="h2" gutterBottom variant="h6">
						Choose a source
					</Typography>
					<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
						<FormControl fullWidth>
							<InputLabel id="syncio-service-label">Streaming service</InputLabel>
							<Select
								label="Streaming service"
								labelId="syncio-service-label"
								onChange={(event) => setServiceId(event.target.value as SyncioNativeHistoryService)}
								value={serviceId}
							>
								{SYNCIO_NATIVE_HISTORY_SERVICES.map((id) => (
									<MenuItem key={id} value={id}>
										{getService(id).name}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						<FormControl fullWidth>
							<InputLabel id="syncio-range-label">History range</InputLabel>
							<Select
								label="History range"
								labelId="syncio-range-label"
								onChange={(event) => setRange(event.target.value)}
								value={range}
							>
								<MenuItem value="all">All available history</MenuItem>
								<MenuItem value="year">Last 12 months</MenuItem>
								<MenuItem value="90-days">Last 90 days</MenuItem>
							</Select>
						</FormControl>
					</Stack>
					<Box sx={{ marginTop: 2 }}>
						<Button
							disabled={isScanning}
							onClick={() => void scan()}
							startIcon={<PlayArrowIcon />}
							variant="contained"
						>
							Run read-only preview
						</Button>
					</Box>
					{isScanning && (
						<Box sx={{ marginTop: 2 }}>
							<LinearProgress />
							<Typography color="text.secondary" sx={{ marginTop: 1 }} variant="body2">
								{progress.fetched} native history items fetched
							</Typography>
						</Box>
					)}
				</Box>

				{error && <Alert severity="error">{error}</Alert>}

				{result && (
					<Box component="section">
						<Stack direction="row" alignItems="center" spacing={1}>
							<CheckCircleOutlineIcon color="success" />
							<Typography component="h2" variant="h6">
								Preview complete
							</Typography>
						</Stack>
						<Typography color="text.secondary" sx={{ marginTop: 1 }}>
							{result.fetched} fetched, {result.previewed} checked in {result.batches} batches.
						</Typography>
						<Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ marginTop: 2 }}>
							<Count label="Ready" value={result.counts.candidate} />
							<Count label="Needs review" value={result.counts.review} />
							<Count label="Excluded" value={result.counts.excluded} />
						</Stack>
						<Typography color="text.secondary" sx={{ marginTop: 2 }} variant="body2">
							Items below 80% are excluded. Nothing has been imported yet.
						</Typography>
					</Box>
				)}

				<Alert severity="warning">
					Disney+ history import is not available yet. Apple TV content watched through Prime Video
					will be tested through the Prime adapter.
				</Alert>
			</Stack>
		</Container>
	);
};

const Count = ({ label, value }: { label: string; value: number }): JSX.Element => (
	<Box>
		<Typography component="strong" variant="h5">
			{value}
		</Typography>
		<Typography color="text.secondary" variant="body2">
			{label}
		</Typography>
	</Box>
);

function rangeStart(range: string): Date | null {
	if (range === 'all') return null;
	const date = new Date();
	date.setUTCDate(date.getUTCDate() - (range === '90-days' ? 90 : 365));
	return date;
}
