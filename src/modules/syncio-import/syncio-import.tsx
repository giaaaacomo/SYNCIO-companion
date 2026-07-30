import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import { AppWrapper } from '@components/AppWrapper';
import { SyncioImportApp } from './SyncioImportApp';
import '@services';
import '@services-apis';
import { createRoot } from 'react-dom/client';

Shared.pageType = 'popup';

Messaging.addListeners();

const init = async () => {
	await BrowserStorage.init();
	Errors.init();
	EventDispatcher.init();
	Messaging.init();
	const container = document.querySelector('#root');
	if (container) {
		createRoot(container).render(
			<AppWrapper usesSession={false} usesRouting={false}>
				<SyncioImportApp />
			</AppWrapper>
		);
	}
};

Messaging.addHandlers({});

void init();
