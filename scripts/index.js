if(window.location.origin != "file://"){
    navigator.serviceWorker.register('./sw.js', { scope: '/' })
    .then(function (registration)
    {
      console.log('Service worker registered successfully');
    }).catch(function (e)
    {
      console.error('Error during service worker registration:', e);
    });
}