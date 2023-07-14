<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Settings } from "./types/stats";

// get settings from local storage
async function getSettingsFromStorage(): Promise<Settings> {
  return await chrome.storage.local
    .get(["settings"])
    .then((result) => result.settings);
}

const settings = ref<Settings | null>(null);

onMounted(async () => {
  const retrievedSettings: Settings = await getSettingsFromStorage();
  settings.value = retrievedSettings;
  console.log("settings from ls", retrievedSettings);
});
</script>

<template>
  <h1>Hello</h1>
  {{ settings }}
</template>

<style scoped></style>
