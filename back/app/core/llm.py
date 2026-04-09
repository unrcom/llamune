import threading
from typing import Optional

_lock = threading.Lock()
_current_model_name: Optional[str] = None
_current_adapter_path: Optional[str] = None
_model = None
_tokenizer = None


def load_model(model_name: str, adapter_path: Optional[str] = None):
    global _current_model_name, _current_adapter_path, _model, _tokenizer
    with _lock:
        if _current_model_name == model_name and _current_adapter_path == adapter_path:
            return
        from mlx_lm import load
        print(f"🔄 Loading model: {model_name}" + (f" adapter: {adapter_path}" if adapter_path else ""))
        if adapter_path:
            _model, _tokenizer = load(model_name, adapter_path=adapter_path)
        else:
            _model, _tokenizer = load(model_name)
        _current_model_name = model_name
        _current_adapter_path = adapter_path
        print(f"✅ Model loaded: {model_name}" + (f" + adapter" if adapter_path else ""))


def generate(prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 512) -> str:
    global _model, _tokenizer
    with _lock:
        if _model is None or _tokenizer is None:
            raise RuntimeError("モデルがロードされていません")
        from mlx_lm import generate as mlx_generate
        if system_prompt:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ]
        else:
            messages = [{"role": "user", "content": prompt}]

        formatted = _tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
        result = mlx_generate(
            _model,
            _tokenizer,
            prompt=formatted,
            max_tokens=max_tokens,
            verbose=False,
        )
        return result


def get_current_model_name() -> Optional[str]:
    return _current_model_name


def get_current_adapter_path() -> Optional[str]:
    return _current_adapter_path


def is_model_loaded() -> bool:
    return _model is not None
