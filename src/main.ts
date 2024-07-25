// Components
import App from "./App.vue"

// Composables
import { createApp } from "vue"

// Plugins
// @ts-expect-error Disable checking for types
import { registerPlugins } from "@/plugins"

const app = createApp(App)

registerPlugins(app)

app.mount("#app")
