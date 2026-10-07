-- Stop only the Botali preview alert job; do not remove pg_cron or other jobs.
select cron.unschedule(jobid)
from cron.job
where jobname = 'botali-price-alert-dispatch-preview';
