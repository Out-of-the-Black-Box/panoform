import Vue from "vue";
import Vuex from "vuex";
import { storage } from "./firebaseConfig.js";

const BASE_IMAGE_URL = "images/";
const storageRef = storage.ref();

Vue.use(Vuex);

let db;

let store = new Vuex.Store({
  state: {
    viewing: false,
    viewer: {
      fullscreen: false,
      stereo: false,
      webVR: false,
      controls: 0,
      webVRDevice: null,
      currentImage: null
    },
    recentImages: []
  },
  mutations: {
    setViewing(state, value) {
      state.viewing = value;
    },
    clearRecentImages(state) {
      state.recentImages = [];
    },
    setRecentImages(state, images) {
      state.recentImages = images;
    },
    addRecentImage(state, image) {
      state.recentImages.unshift(image);
    },
    removeRecentImage(state, key) {
      state.recentImages = state.recentImages.filter(image => image.key != key);
    },
    setCurrentImage(state, image) {
      state.viewer.currentImage = image;
    },
    setStereo(state, value) {
      state.viewer.stereo = value;
    },
    setFullscreen(state, value) {
      state.viewer.fullscreen = value;
    },
    setControls(state, value) {
      state.viewer.controls = value;
    },
    setWebVRDevice(state, value) {
      state.viewer.webVRDevice = value;
    },
    setWebVR(state, value) {
      state.viewer.webVR = value;
    }
  },
  actions: {
    clearRecentImages({ commit }) {
      let objStore = db
        .transaction(["images"], "readwrite")
        .objectStore("images");

      let request = objStore.clear();

      request.onerror = () => {
        console.log("Error clearing database");
      };

      request.onsuccess = () => {
        commit("clearRecentImages");
      };
    },
    getRecentImages({ commit }) {
      let objStore = db.transaction(["images"]).objectStore("images");
      let request = objStore.index("created").getAll();

      request.onerror = () => {
        console.log("Error getting images");
      };

      request.onsuccess = () => {
        commit("setRecentImages", request.result);
      };
    },
    addRecentImage({ commit }, data, name) {
      let image = {
        created: new Date()
          .toJSON()
          .slice(0, 19)
          .replace("T", " "),
        data: data
      };

      let imageRef = storageRef.child(BASE_IMAGE_URL + name);

      imageRef
        .putString(data, "data_url")
        .then(async snapshot => {
          const downloadURL = await snapshot.ref.getDownloadURL();
          image.url = downloadURL;
          commit("addRecentImage", image);
          console.log("Uploaded a blob or file!");
        })
        .catch(err => console.log("Error adding image:", err));
    },
    removeRecentImage({ commit }, key) {
      let objStore = db
        .transaction(["images"], "readwrite")
        .objectStore("images");
      let request = objStore.delete(key);

      request.onerror = () => {
        console.log("Error removing image");
      };

      request.onsuccess = () => {
        commit("removeRecentImage", key);
      };
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  if (!("indexedDB" in window)) return;

  const dbName = "panoformDB";
  const dbVersion = 1;
  let request = window.indexedDB.open(dbName, dbVersion);

  request.onerror = e => {
    console.log(e);
  };

  request.onsuccess = e => {
    console.log("Database created");
    db = e.target.result;
    store.dispatch("getRecentImages");
  };

  request.onupgradeneeded = e => {
    let db = e.target.result;
    let objStore = db.createObjectStore("images", {
      keyPath: "key",
      autoIncrement: true
    });
    objStore.createIndex("created", "created", { unique: false });
    objStore.createIndex("data", "data", { unique: true });
  };
});

export default store;
