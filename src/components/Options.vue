<script setup lang="ts">
import { ref, onMounted, watch } from "vue"
import { useTheme } from "vuetify"

import {
  Settings,
  TimeInterval,
  GameMode,
  SettingsJSON
} from "../types/settings"

import { SettingsManager } from "../modules/SettingsManager"
import { ChromeSettingsStorage } from "../modules/ChromeSettingsStorage"

import package_json from "../../package.json"
import settings_json from "../../settings.json"

const {
  defaultSettings: {
    popup_darkmode,
    game_modes,
    show_stats,
    show_accuracy,
    hide_own_stats,
    color_highlighting,
    time_interval
  },
  validGameModes,
  validTimeIntervals
} = settings_json

const settingsManager: SettingsManager = new SettingsManager(
  new ChromeSettingsStorage(),
  settings_json as SettingsJSON
)

// Define Refs
const modeStatsRef = ref(validGameModes)
const timeIntervalsRef = ref(validTimeIntervals)

const darkmodeRef = ref(popup_darkmode)
const showModesRef = ref(game_modes)
const showStatsRef = ref(show_stats)
const showAccuracyRef = ref(show_accuracy)
const hideOwnStatsRef = ref(hide_own_stats)
const showColorHighlightingRef = ref(color_highlighting)
const timeIntervalRef = ref(time_interval)

const snackbar = ref(false)
const snackbar_timeout = ref(1500)
const snackbar_text = ref("Updated settings")

const theme = useTheme()

watch(
  () => darkmodeRef.value,
  (newVal) => {
    if (newVal) theme.global.name.value = "dark"
    else theme.global.name.value = "light"
  }
)

// save settings to local storage
async function saveSettings(): Promise<void> {
  let settings: Settings = {
    show_stats: showStatsRef.value,
    show_accuracy: showAccuracyRef.value,
    hide_own_stats: hideOwnStatsRef.value,
    game_modes: Array.from(showModesRef.value) as GameMode[],
    time_interval: timeIntervalRef.value as TimeInterval,
    color_highlighting: showColorHighlightingRef.value,
    popup_darkmode: darkmodeRef.value
  }
  await settingsManager.saveSettingsToStorage(settings)

  // send update message to content script
  const [activeTab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  })

  if (!activeTab) return console.log("Could not find active Tab")

  chrome.tabs.sendMessage(activeTab.id!, {
    action: "updated-settings"
  })

  console.log("saved settings to local storage", settings)
  snackbar_text.value = "Updated settings"
  snackbar_timeout.value = 1500
  snackbar.value = true
}

function updateUI() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0]
    if (activeTab) {
      chrome.tabs.sendMessage(activeTab.id!, {
        action: "updateStats"
      })
    }
  })
}

function savePressed() {
  updateUI()
  saveSettings()
}

// function showComingSoon() {
//   snackbar_text.value = "Coming soon";
//   snackbar_timeout.value = 500;
//   snackbar.value = true;
// }

function openGihtub() {
  chrome.tabs.create({
    url: package_json.repository.url
  })
}

onMounted(async () => {
  const settings: Settings = await settingsManager.getSettingsFromStorage()
  // set ui elements according to settings or default settings
  showModesRef.value = settings.game_modes
  showStatsRef.value = settings.show_stats
  showAccuracyRef.value = settings.show_accuracy
  hideOwnStatsRef.value = settings.hide_own_stats
  showColorHighlightingRef.value = settings.color_highlighting
  timeIntervalRef.value = settings.time_interval
  darkmodeRef.value = settings.popup_darkmode
  console.log("read settings from local storage", settings)
})
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
          <v-icon @click="darkmodeRef = !darkmodeRef">
            {{ darkmodeRef ? "mdi-brightness-4" : "mdi-brightness-5" }}
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
            v-model="showStatsRef"
            label="Show stats"
            color="primary"
            hide-details
          ></v-switch>
        </v-col>
        <v-col cols="6">
          <v-switch
            v-model="showAccuracyRef"
            label="Show average accuracy"
            color="primary"
            hide-details
            :disabled="!showStatsRef"
          ></v-switch>
        </v-col>
        <v-col cols="6">
          <v-switch
            v-model="hideOwnStatsRef"
            label="Hide own stats"
            color="primary"
            hide-details
            :disabled="!showStatsRef"
          ></v-switch>
        </v-col>
        <v-col cols="6">
          <v-switch
            v-model="showColorHighlightingRef"
            label="Color highlighting"
            color="primary"
            hide-details
            :disabled="!showStatsRef"
          ></v-switch>
        </v-col>
        <v-col cols="6">
          <v-combobox
            v-model="showModesRef"
            :items="modeStatsRef"
            label="Modes included in stats"
            variant="underlined"
            multiple
            hide-details
            :disabled="!showStatsRef"
          ></v-combobox>
        </v-col>
        <v-col cols="6">
          <v-combobox
            v-model="timeIntervalRef"
            :items="timeIntervalsRef"
            label="Time interval"
            variant="underlined"
            hide-details
            :disabled="!showStatsRef"
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
