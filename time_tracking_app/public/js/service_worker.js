<script>
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/assets/time_tracking_app/service_worker.js")
        .catch(err => console.error("SW registration failed", err));
    });
  }
</script>