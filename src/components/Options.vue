<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useTheme } from "vuetify";

import { Settings } from "../types/stats";
import {
  getSettingsFromStorage,
  saveSettingsToStorage,
} from "../scripts/utils";

const theme = useTheme();
const darkmode = ref<boolean>(true);

const modeStats = ref(["blitz", "rapid", "bullet", "daily"]);
const showModes = ref(["blitz", "rapid", "bullet"]);
const showStats = ref(true);
const showAccuracy = ref(true);
const hideOwnStats = ref(false);
const showColorHighlighting = ref(false);
const timeIntervals = ref([
  "last hour",
  "last 6 hours",
  "last 12 hours",
  "last day",
  "last 3 days",
  "last week",
  "this month",
]);
const timeInterval = ref("last 12 hours");
const snackbar = ref(false);
const snackbar_timeout = ref(1500);
const snackbar_text = ref("Updated settings");

watch(
  () => darkmode.value,
  (newVal) => {
    if (newVal) theme.global.name.value = "dark";
    else theme.global.name.value = "light";
  }
);

// save settings to local storage
async function saveSettings(): Promise<void> {
  let settings: Settings = {
    show_stats: showStats.value,
    show_accuracy: showAccuracy.value,
    hide_own_stats: hideOwnStats.value,
    game_modes: Array.from(showModes.value) as (
      | "blitz"
      | "rapid"
      | "bullet"
      | "daily"
    )[],
    time_interval: timeInterval.value,
    color_highlighting: showColorHighlighting.value,
    popup_darkmode: darkmode.value,
  };
  await saveSettingsToStorage(settings);

  // send update message to content script
  const [activeTab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  chrome.tabs.sendMessage(activeTab.id!, {
    action: "updated-settings",
  });

  console.log("saved settings to local storage", settings);
  snackbar_text.value = "Updated settings";
  snackbar_timeout.value = 1500;
  snackbar.value = true;
}

function updateUI() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    if (activeTab) {
      chrome.tabs.sendMessage(activeTab.id!, {
        action: "updateStats",
      });
    }
  });
}

function savePressed() {
  updateUI();
  saveSettings();
}

// function showComingSoon() {
//   snackbar_text.value = "Coming soon";
//   snackbar_timeout.value = 500;
//   snackbar.value = true;
// }

function openGihtub() {
  chrome.tabs.create({
    url: "https://github.com/thieleju/chess-com-insights",
  });
}

onMounted(async () => {
  const settings: Settings = await getSettingsFromStorage();
  // set ui elements according to settings
  showModes.value = settings.game_modes || ["blitz", "rapid", "bullet"];
  showStats.value = settings.show_stats || true;
  showAccuracy.value = settings.show_accuracy || true;
  hideOwnStats.value = settings.hide_own_stats || false;
  showColorHighlighting.value = settings.color_highlighting || false;
  timeInterval.value = settings.time_interval || "last 12 hours";
  darkmode.value = settings.popup_darkmode || true;
  console.log("read settings from local storage", settings);
});
</script>

<template>
  <v-card style="border-radius: 0px" class="container">
    <!-- Title -->
    <v-card-title>
      <v-row align="center">
        <v-col cols="auto" style="padding-right: 2px">
          <v-img src="@/assets/icon48.png" width="24"></v-img>
        </v-col>
        <v-col cols="auto" style="padding-left: 2px">
          <span class="title">Chess.com Insights</span>
        </v-col>
        <v-spacer></v-spacer>
        <v-col cols="auto">
          <v-icon @click="darkmode = !darkmode">
            {{ darkmode ? "mdi-brightness-4" : "mdi-brightness-5" }}
          </v-icon>
        </v-col>
      </v-row>
    </v-card-title>
    <!-- Subtitle -->
    <v-card-subtitle>Modify your chess.com insights</v-card-subtitle>
    <!-- Content -->
    <v-card-text>
      <!-- Settings -->
      <v-row>
        <v-col cols="6">
          <v-switch
            v-model="showStats"
            label="Show stats"
            color="primary"
            hide-details
          ></v-switch>
        </v-col>
        <v-col cols="6">
          <v-switch
            v-model="showAccuracy"
            label="Show average accuracy"
            color="primary"
            hide-details
          ></v-switch>
        </v-col>
        <v-col cols="6">
          <v-switch
            v-model="hideOwnStats"
            label="Hide own stats"
            color="primary"
            hide-details
          ></v-switch>
        </v-col>
        <v-col cols="6">
          <v-switch
            v-model="showColorHighlighting"
            label="Color highlighting"
            color="primary"
            hide-details
          ></v-switch>
        </v-col>
        <v-col cols="6">
          <v-combobox
            v-model="showModes"
            :items="modeStats"
            label="Modes included in stats"
            variant="underlined"
            multiple
            hide-details
          ></v-combobox>
        </v-col>
        <v-col cols="6">
          <v-combobox
            v-model="timeInterval"
            :items="timeIntervals"
            label="Time interval"
            variant="underlined"
            hide-details
          ></v-combobox>
        </v-col>
      </v-row>
    </v-card-text>
    <!-- Actions -->
    <v-card-actions>
      <v-btn
        color="primary"
        @click="openGihtub"
        small
        icon="mdi-github"
      ></v-btn>
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        variant="text"
        prepend-icon="mdi-content-save-outline"
        @click="savePressed"
        >save</v-btn
      >
    </v-card-actions>
  </v-card>
  <v-snackbar
    v-model="snackbar"
    :timeout="snackbar_timeout"
    variant="outlined"
    color="primary"
  >
    <v-icon left>mdi-check-circle-outline</v-icon>
    {{ snackbar_text }}
  </v-snackbar>
</template>

<style>
.container {
  min-width: 510px;
  max-width: 510px;
}
</style>
