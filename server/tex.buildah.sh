#!/bin/bash

set -euo pipefail

tex=$(buildah from scratch)
mnt=$(buildah mount $tex)

buildah add $tex https://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz

dnf install -y --installroot $mnt \
  --release 39 \
  --setopt=install_weak_depts=False \
  tar \
  bash \
  perl \
  coreutils 

buildah run $tex tar -xvf install-tl-unx.tar.gz

buildah copy $tex texlive.profile
buildah run $tex perl install-tl-20240122/install-tl -profile texlive.profile

# Add TeX to path
buildah config --env PATH="$PATH:/usr/local/texlive/2023/bin/x86_64-linux" $tex

buildah run $tex /usr/local/texlive/2023/bin/x86_64-linux/tlmgr install pgf pgfplots amsmath xcolor standalone bibtex
