# NZ-50 model artifacts

Generated model files are intentionally ignored by Git.

Expected runtime artifact:

`vmmr_nz50.onnx`

Download the pinned source assets:

```powershell
curl.exe -L -o backend/models/vehicle_classifier.pth `
  https://huggingface.co/Jordo23/vehicle-classifier/resolve/7a0a0ee5584202b5eba858cf7464f5ca6b7341b3/vehicle_classifier.pth
curl.exe -L -o backend/models/class_mapping.csv `
  https://huggingface.co/Jordo23/vehicle-classifier/resolve/7a0a0ee5584202b5eba858cf7464f5ca6b7341b3/class_mapping.csv
```

Export:

```powershell
python backend/tools/export_vmmr_family_onnx.py `
  --checkpoint backend/models/vehicle_classifier.pth `
  --mapping backend/models/class_mapping.csv `
  --manifest backend/vehicle_model_manifest.json `
  --output backend/models/vmmr_nz50.onnx
```

Validate:

```powershell
python backend/tools/validate_vehicle_family_model.py `
  --model backend/models/vmmr_nz50.onnx `
  --manifest backend/vehicle_model_manifest.json
```

The TensorRT engine is generated on the AGX Xavier and must not be copied
from another GPU.
