import { createApp } from 'vue';
import { IonicVue } from '@ionic/vue';
import App from './App.vue';
import router from './router';

import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';
import './theme/variables.css';

import { syncAll } from '@/services/syncService';

const app = createApp(App)
  .use(IonicVue)
  .use(router);

router.isReady().then(() => {
  app.mount('#app');

  // direkt beim Start versuchen zu syncen
  syncAll();

  // wenn die App wieder online geht → sync
  window.addEventListener('online', () => {
    syncAll();
  });
});
