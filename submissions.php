<?php
// The old submissions table was public (anyone with the URL could see every lead).
// It now lives behind a login in the BDE panel. Relative redirect, so it works in a sub-folder too.
header('Location: admin/', true, 301);
exit;
