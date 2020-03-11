import Vue from "vue";
import Vuex from "vuex";
import { storage } from "./firebaseConfig.js";
import { promised } from "q";
import { get } from "http";

const BASE_IMAGE_URL = "images/";
const storageRef = storage.ref();

const getNewJSONDate = () =>
  new Date()
    .toJSON()
    .slice(0, 19)
    .replace("T", " ");

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
      var listRef = storageRef.child(BASE_IMAGE_URL);

      listRef
        .listAll()
        .then(async res => {
          const downloadURLPromises = [];
          res.items.forEach(imageRef => {
            downloadURLPromises.push(imageRef.getDownloadURL());
          });

          const downloadURLs = await Promise.all(downloadURLPromises);
          const images = downloadURLs.map(url => ({
            created: getNewJSONDate(),
            data: url
          }));

          commit("setRecentImages", images);
        })
        .catch(error => {
          console.log("Error listing items:", error);
        });
    },
    addRecentImage({ commit }, data, name) {
      let imageRef = storageRef.child(BASE_IMAGE_URL + name);

      imageRef
        .putString(data, "data_url")
        .then(async snapshot => {
          const downloadURL = await snapshot.ref.getDownloadURL();
          const image = {
            created: getNewJSONDate(),
            data: downloadURL
          };

          commit("addRecentImage", image);
          console.log("Uploaded a blob or file!");
        })
        .catch(error => console.log("Error adding image:", error));
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
