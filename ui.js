// Estado base da UI do plugin
const state = {
  step: 1,
  uploadedImages: /** @type {File[]} */ ([]),
  selectedTemplateId: /** @type {string | null} */ (null),
  maxFiles: 50
};

// Templates mockados — em produção, virão de fonte dinâmica
const templates = [
  { id: "t3", slides: 3 },
  { id: "t5", slides: 5 },
  { id: "t7", slides: 7 },
  { id: "t10", slides: 10 }
];

function updateStepperPill() {
  const pills = document.querySelectorAll("[data-step-pill]");
  pills.forEach((el) => {
    const step = Number(el.getAttribute("data-step-pill"));
    el.classList.toggle("stepper-pill-item--active", step === state.step);
  });
}

function updateScreenTitle() {
  const title = document.getElementById("screenTitle");
  if (!title) return;
  if (state.step === 1) title.textContent = "Upload";
  if (state.step === 2) title.textContent = "Tema";
  if (state.step === 3) title.textContent = "Pronto!";
}

function updateScreensVisibility() {
  document.querySelectorAll(".screen").forEach((el) => {
    const screen = Number(el.getAttribute("data-screen"));
    el.classList.toggle("screen--active", screen === state.step);
  });
}

function updateFooterButtons() {
  const back = document.getElementById("btnBack");
  const primary = document.getElementById("btnPrimary");
  const primaryLabel = document.getElementById("btnPrimaryLabel");

  if (!back || !primary || !primaryLabel) return;

  back.disabled = state.step === 1;

  if (state.step === 1) {
    primaryLabel.textContent = "Continuar";
    primary.disabled = state.uploadedImages.length === 0;
  } else if (state.step === 2) {
    primaryLabel.textContent = "Continuar";
    primary.disabled = !state.selectedTemplateId;
  } else {
    primaryLabel.textContent = "Criar Slide";
    primary.disabled = !state.selectedTemplateId || state.uploadedImages.length === 0;
  }
}

function setStep(step) {
  state.step = step;
  updateStepperPill();
  updateScreenTitle();
  updateScreensVisibility();
  updateFooterButtons();
}

function handleFilesSelected(files) {
  if (!files || files.length === 0) {
    state.uploadedImages = [];
    updateFooterButtons();
    return;
  }

  const validFiles = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    validFiles.push(f);
    if (validFiles.length >= state.maxFiles) break;
  }

  state.uploadedImages = validFiles;
  updateFooterButtons();
}

function renderTemplates() {
  const grid = document.getElementById("templatesGrid");
  if (!grid) return;
  grid.innerHTML = "";

  templates.forEach((t) => {
    const card = document.createElement("div");
    card.className = "template-card";
    card.setAttribute("data-template-id", t.id);

    const chip = document.createElement("div");
    chip.className = "template-chip";
    chip.textContent = `${t.slides} slides`;

    card.appendChild(chip);

    card.addEventListener("click", () => {
      state.selectedTemplateId = t.id;
      document.querySelectorAll(".template-card").forEach((c) => {
        const id = c.getAttribute("data-template-id");
        c.classList.toggle("template-card--selected", id === t.id);
      });
      updateFooterButtons();
    });

    grid.appendChild(card);
  });
}

async function convertFilesToBase64(files) {
  const base64Array = [];
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Converte para base64
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    base64Array.push(base64);
  }
  
  return base64Array;
}

async function createCarousel(templateId, images) {
  // Converte as imagens para base64 antes de enviar
  const imagesBase64 = await convertFilesToBase64(images);
  
  parent.postMessage(
    {
      pluginMessage: {
        type: "create-carousel",
        templateId,
        imagesMetadata: images.map((f) => ({ name: f.name, size: f.size })),
        imagesBase64: imagesBase64
      }
    },
    "*"
  );
}

function init() {
  const fileInput = document.getElementById("fileInput");
  const uploadDropzone = document.getElementById("uploadDropzone");
  const btnBack = document.getElementById("btnBack");
  const btnPrimary = document.getElementById("btnPrimary");

  if (fileInput) {
    fileInput.addEventListener("change", (event) => {
      const target = event.target;
      if (target && target.files) {
        handleFilesSelected(target.files);
      }
    });
  }

  if (uploadDropzone) {
    uploadDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    uploadDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files) {
        handleFilesSelected(e.dataTransfer.files);
      }
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      if (state.step > 1) setStep(state.step - 1);
    });
  }

  if (btnPrimary) {
    btnPrimary.addEventListener("click", async () => {
      if (state.step === 1 && state.uploadedImages.length > 0) {
        setStep(2);
      } else if (state.step === 2 && state.selectedTemplateId) {
        setStep(3);
      } else if (
        state.step === 3 &&
        state.selectedTemplateId &&
        state.uploadedImages.length > 0
      ) {
        await createCarousel(state.selectedTemplateId, state.uploadedImages);
      }
    });
  }

  renderTemplates();
  setStep(state.step);
}

document.addEventListener("DOMContentLoaded", init);

