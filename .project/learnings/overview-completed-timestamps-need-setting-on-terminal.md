`updateOverviewStatus` helpers only update `status`, leaving `completed` permanently `null`. Set `completed` when entities transition to terminal states (completed/abandoned).
