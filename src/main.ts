import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import './vocabulary.css'
import './characters.css'
import './dashboard.css'
import { installPressFeedback } from './press-feedback'

installPressFeedback()
createApp(App).use(createPinia()).use(router).mount('#app')
