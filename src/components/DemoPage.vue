<template>
  <main class="demo" data-demo="true">
    <div id="reader-app"></div>
    <div class="demo__panel">
      <p class="demo__status" data-demo-status role="status">Loading the sample archive…</p>
      <p class="demo__error" data-demo-error hidden>
        The sample could not be downloaded. Check the connection and reload this page.
      </p>
      <p class="demo__hint">
        A built-in sample opens automatically, nothing to pick.
        <a href="/">Read your own file instead</a>
      </p>
    </div>
  </main>
</template>
