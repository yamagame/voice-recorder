import sys

# warning 出力を抑制


def suppress_warning():
    if not sys.warnoptions:
        import warnings
        warnings.simplefilter("ignore")
