import { SyncioClient, SyncioUpdateStatus } from '@/syncio/SyncioClient';
import { SyncioConnection, SyncioStorage } from '@/syncio/SyncioStorage';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LinkIcon from '@mui/icons-material/Link';
import RefreshIcon from '@mui/icons-material/Refresh';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

type ConnectionState = 'loading' | 'connected' | 'disconnected' | 'error';

export const SyncioConnectionPanel = (): JSX.Element => {
	const [connection, setConnection] = useState<SyncioConnection | null>(null);
	const [state, setState] = useState<ConnectionState>('loading');
	const [workerUrl, setWorkerUrl] = useState('');
	const [code, setCode] = useState('');
	const [label, setLabel] = useState(defaultDeviceLabel());
	const [message, setMessage] = useState('');
	const [update, setUpdate] = useState<SyncioUpdateStatus | null>(null);

	const checkConnection = async (stored?: SyncioConnection | null) => {
		const current = stored === undefined ? await SyncioStorage.getConnection() : stored;
		setConnection(current);
		if (!current) {
			setState('disconnected');
			setUpdate(null);
			return;
		}
		setState('loading');
		try {
			const client = await SyncioClient.fromStorage();
			if (!client) throw new Error('SYNCIO connection is missing.');
			await client.status();
			setState('connected');
			setMessage('');
			try {
				setUpdate(await client.updateStatus());
			} catch {
				setUpdate(null);
			}
		} catch (error) {
			setState('error');
			setMessage(error instanceof Error ? error.message : 'Could not reach the SYNCIO Worker.');
		}
	};

	useEffect(() => {
		void checkConnection();
	}, []);

	const pair = async (event: FormEvent) => {
		event.preventDefault();
		setState('loading');
		setMessage('');
		try {
			const paired = await SyncioClient.pair(workerUrl, code, label);
			setCode('');
			await checkConnection(paired);
		} catch (error) {
			setState('error');
			setMessage(error instanceof Error ? error.message : 'Could not pair with SYNCIO.');
		}
	};

	const disconnect = async () => {
		setState('loading');
		setMessage('');
		try {
			const client = await SyncioClient.fromStorage();
			if (client) await client.disconnect();
			setConnection(null);
			setUpdate(null);
			setState('disconnected');
		} catch (error) {
			setState('error');
			setMessage(error instanceof Error ? error.message : 'Could not disconnect from SYNCIO.');
		}
	};

	return (
		<Box
			component="section"
			sx={{
				border: 1,
				borderColor: 'divider',
				borderRadius: 1,
				padding: 2,
				marginBottom: 3,
			}}
		>
			<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
				<Box>
					<Typography component="h2" variant="h6">
						SYNCIO
					</Typography>
					<Typography color="text.secondary" variant="body2">
						Import viewing activity from streaming services. Browser history is never read.
					</Typography>
				</Box>
				{state === 'connected' && (
					<Stack direction="row" alignItems="center" color="success.main" spacing={0.5}>
						<CheckCircleOutlineIcon fontSize="small" />
						<Typography variant="body2">Connected</Typography>
					</Stack>
				)}
				{state === 'loading' && <CircularProgress size={22} />}
			</Stack>

			{connection ? (
				<Stack spacing={2} sx={{ marginTop: 2 }}>
					<Box>
						<Typography variant="body2">{connection.client.label}</Typography>
						<Typography color="text.secondary" variant="caption">
							{connection.workerUrl}
						</Typography>
					</Box>
					<Stack direction="row" spacing={1}>
						{state === 'connected' && (
							<Button
								startIcon={<ManageSearchIcon />}
								onClick={() =>
									void browser.tabs.create({ url: browser.runtime.getURL('syncio-import.html') })
								}
								variant="contained"
							>
								Preview history
							</Button>
						)}
						<Button
							startIcon={<RefreshIcon />}
							onClick={() => void checkConnection()}
							variant="outlined"
						>
							Check
						</Button>
						<Button
							color="error"
							startIcon={<DeleteOutlineIcon />}
							onClick={() => void disconnect()}
							variant="outlined"
						>
							Disconnect
						</Button>
					</Stack>
					{update?.updateAvailable && (
						<Alert
							action={
								<Button
									color="inherit"
									onClick={() =>
										void browser.tabs.create({
											url: `${connection.workerUrl}/configure#updates`,
										})
									}
									startIcon={<SystemUpdateAltIcon />}
								>
									Review update
								</Button>
							}
							severity="info"
						>
							Worker {update.latestVersion} is available. This installation runs{' '}
							{update.currentVersion}.
						</Alert>
					)}
					{update && !update.updateAvailable && update.state !== 'unavailable' && (
						<Typography color="text.secondary" variant="caption">
							Worker {update.currentVersion} is{' '}
							{update.state === 'ahead' ? 'a preview build' : 'up to date'}.
						</Typography>
					)}
				</Stack>
			) : (
				<Box component="form" onSubmit={(event) => void pair(event)} sx={{ marginTop: 2 }}>
					<Stack spacing={2}>
						<TextField
							fullWidth
							label="SYNCIO Worker URL"
							onChange={(event) => setWorkerUrl(event.target.value)}
							placeholder="https://your-syncio-worker.workers.dev"
							required
							type="url"
							value={workerUrl}
						/>
						<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
							<TextField
								fullWidth
								label="One-time pairing code"
								onChange={(event) => setCode(event.target.value)}
								required
								value={code}
							/>
							<TextField
								fullWidth
								label="Browser name"
								onChange={(event) => setLabel(event.target.value)}
								required
								value={label}
							/>
						</Stack>
						<Box>
							<Button startIcon={<LinkIcon />} type="submit" variant="contained">
								Connect to SYNCIO
							</Button>
						</Box>
					</Stack>
				</Box>
			)}

			{message && (
				<Alert severity={state === 'error' ? 'error' : 'info'} sx={{ marginTop: 2 }}>
					{message}
				</Alert>
			)}
		</Box>
	);
};

function defaultDeviceLabel(): string {
	const browserName = navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Chromium';
	return `${browserName} browser`;
}
