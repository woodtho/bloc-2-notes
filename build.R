# Run with: Rscript build.R
# Builds the local website into docs/. No publishing or network access.
args <- commandArgs(trailingOnly = FALSE)
script <- grep("^--file=", args, value = TRUE)
if (length(script)) setwd(dirname(normalizePath(sub("^--file=", "", script[1]))))

if (.Platform$OS.type == "windows") {
  user_lib <- file.path(Sys.getenv("LOCALAPPDATA"), "R", "win-library",
                        paste(R.version$major, strsplit(R.version$minor, "\\.")[[1]][1], sep = "."))
  if (dir.exists(user_lib)) .libPaths(c(user_lib, .libPaths()))
}
if (!requireNamespace("rmarkdown", quietly = TRUE))
  stop("Install the R package rmarkdown, then rerun Rscript build.R.")

if (!rmarkdown::pandoc_available()) {
  candidates <- unique(c(Sys.getenv("RSTUDIO_PANDOC"), dirname(Sys.which("pandoc")),
                         file.path(Sys.getenv("LOCALAPPDATA"), "Pandoc")))
  for (p in candidates[nzchar(candidates)]) {
    found <- rmarkdown::find_pandoc(cache = FALSE, dir = p)
    if (!is.null(found$dir)) break
    # Some Windows R builds report file_test('-x') FALSE for a runnable exe.
    # Verify it actually runs and obtain its version before caching the path.
    exe <- file.path(p, if (.Platform$OS.type == "windows") "pandoc.exe" else "pandoc")
    if (!file.exists(exe)) next
    ver <- tryCatch(system2(exe, "--version", stdout = TRUE, stderr = TRUE), error = function(e) character())
    if (length(ver) && grepl("^pandoc [0-9]+\\.[0-9]+", ver[1])) {
      version <- sub("^pandoc ([0-9.]+).*$", "\\1", ver[1])
      getFromNamespace("set_pandoc_info", "rmarkdown")(p, numeric_version(version))
      break
    }
  }
}
if (!rmarkdown::pandoc_available()) stop("Pandoc is required. Put it on PATH or set RSTUDIO_PANDOC.")
rmarkdown::render_site(encoding = "UTF-8", quiet = TRUE)
file.create(file.path("docs", ".nojekyll"), showWarnings = FALSE)
message("Built ", normalizePath("docs/index.html", winslash = "/"))
