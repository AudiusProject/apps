---
'@audius/mobile': patch
---

Fix the mobile play queue drag-to-reorder gesture: dragging a track row was being claimed by the queue drawer's swipe-to-dismiss pan responder, so reorder attempts dragged the drawer down instead. The drawer now suspends its pan responder while a row is being dragged. Also adds a grabber bar above the Queue title and a bit more breathing room in the header.
