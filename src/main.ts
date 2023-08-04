// Components
import App from "./App.vue"

// Composables
import { createApp } from "vue"

// Plugins
// @ts-ignore
import { registerPlugins } from "@/plugins"

const app = createApp(App)

registerPlugins(app)

app.mount("#app")
