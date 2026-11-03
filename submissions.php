<?php
// The old submissions table was public (anyone with the URL could see every lead).
// It now lives behind a login in the BDE panel.
header('Location: /admin/', true, 301);
exit;
