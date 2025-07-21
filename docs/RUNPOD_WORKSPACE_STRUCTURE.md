# OurVidz RunPod Workspace Structure

**Last Updated:** July 21, 2025

---

## Overview

This document describes the file and directory structure of the `/workspace` directory on the OurVidz RunPod server. It details where models, Python dependencies, and worker scripts are located, and provides setup notes for onboarding and troubleshooting.

---

## Directory Tree (Key Locations)

```
/workspace/
├── models/                # All model files and subfolders
│   ├── sdxl-lustify/
│   │   ├── lustifySDXLNSFWSFW_v20.safetensors   # Main SDXL model (6.5G)
│   │   └── [test scripts, test images, etc.]
│   ├── wan2.1-t2v-1.3b/
│   │   ├── diffusion_pytorch_model.safetensors  # Main WAN model (5.3G)
│   │   ├── models_t5_umt5-xxl-enc-bf16.pth      # Large model (11G)
│   │   └── [VAE, config, assets, etc.]
│   └── huggingface_cache/
│       └── models--Qwen--Qwen2.5-7B-Instruct/   # Huggingface cache for Qwen
├── python_deps/
│   └── lib/
│       └── python3.11/
│           └── site-packages/
│               ├── compel/
│               ├── diffusers/
│               ├── pyparsing/
│               └── [many other packages...]
├── ourvidz-worker/
│   ├── sdxl_worker.py         # SDXL image generation worker
│   ├── wan_worker.py          # WAN video/image generation worker
│   ├── dual_orchestrator.py   # Orchestrator for both workers
│   ├── wan_generate.py        # WAN generation logic
│   └── backup_wan_generate.py # Backup WAN generation logic
├── Wan2.1/                    # (purpose unknown, possibly WAN-related code/data)
├── output/                    # Output folder
├── test_output/               # Output folder for tests
└── backup_requirements.txt     # Backup requirements file
```

---

## Model Locations

- **SDXL Model:**
  - Path: `/workspace/models/sdxl-lustify/lustifySDXLNSFWSFW_v20.safetensors`
  - Size: ~6.5GB
  - Additional test scripts and images are present in the same folder.

- **WAN Model:**
  - Path: `/workspace/models/wan2.1-t2v-1.3b/diffusion_pytorch_model.safetensors`
  - Size: ~5.3GB
  - Additional large model: `models_t5_umt5-xxl-enc-bf16.pth` (~11GB)
  - VAE: `Wan2.1_VAE.pth` (~485MB)
  - Config, assets, and example folders are present.

- **Huggingface Cache:**
  - Path: `/workspace/models/huggingface_cache/`
  - Used for caching models like Qwen 7B (`models--Qwen--Qwen2.5-7B-Instruct/`).

---

## Python Dependencies

- **Custom Python packages are installed in:**
  - `/workspace/python_deps/lib/python3.11/site-packages/`
- **Key packages present:**
  - `compel`, `diffusers`, `pyparsing`, `transformers`, `PIL`, `numpy`, etc.
- **To ensure these are found by Python, set:**
  ```bash
  export PYTHONPATH=/workspace/python_deps/lib/python3.11/site-packages:$PYTHONPATH
  ```
- **If you install new packages, use pip with the target:**
  ```bash
  pip install --target=/workspace/python_deps/lib/python3.11/site-packages <package>
  ```

---

## Worker Scripts

- **Located in:** `/workspace/ourvidz-worker/`
- **Key scripts:**
  - `sdxl_worker.py`         – SDXL image generation worker
  - `wan_worker.py`          – WAN video/image generation worker
  - `dual_orchestrator.py`   – Orchestrator for both workers
  - `wan_generate.py`        – WAN generation logic
  - `backup_wan_generate.py` – Backup WAN generation logic

---

## Setup & Troubleshooting Notes

- **Model files must be present at the exact paths above for the workers to function.**
- **Python dependencies must be installed in `/workspace/python_deps/lib/python3.11/site-packages/` and `PYTHONPATH` must be set.**
- **If you see ImportError or ModuleNotFoundError, check your `PYTHONPATH` and that the package exists in the directory above.**
- **If a model file is missing, check your download scripts or re-upload the model to the correct folder.**
- **Worker scripts should be run from `/workspace/ourvidz-worker/` and may reference models and dependencies using absolute paths as above.**

---

## Example: Running a Worker Script

```bash
cd /workspace/ourvidz-worker
export PYTHONPATH=/workspace/python_deps/lib/python3.11/site-packages:$PYTHONPATH
python sdxl_worker.py
```

---

## Updating This Document

If you add new models, dependencies, or scripts, update this document to reflect the new structure and paths. This will help with onboarding, debugging, and reproducibility. 