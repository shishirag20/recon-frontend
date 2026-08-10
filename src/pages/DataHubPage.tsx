import React, { useState, useEffect } from 'react';
import { Topbar } from '../components/layout/Topbar';
import { TabBar, type TabItem } from '../components/layout/TabBar';
import { JobsTab } from '../components/data-hub/JobsTab';
import { SchemasTab } from '../components/data-hub/SchemasTab';
import { DataExplorerTab } from '../components/data-hub/DataExplorerTab';
import { InsertRowModal } from '../components/data-hub/InsertRowModal';
import { useModal } from '../hooks/useModal';
import { useToast } from '../hooks/useToast';
import { useDataHubStore } from '../store/useDataHubStore';
import { dataSourceService, ingestionJobService } from '../services';
import type { FieldMapping } from '../types';
import type { IngestionJobOut } from '../types/datahub';

const DATA_HUB_TABS: TabItem[] = [
  { key: 'jobs', label: 'Ingestion Jobs' },
  { key: 'schemas', label: 'Schemas & Validation' },
  { key: 'explorer', label: 'Data Explorer' },
];

export const DataHubPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('jobs');
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  const { openModal, closeModal } = useModal();
  const { toast } = useToast();

  const { jobs, setJobs, setSources, upsertJob } = useDataHubStore();

  // ── On mount: fetch data sources (for source_id map) and job list ──────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const [sources, jobList] = await Promise.all([
          dataSourceService.list(),
          ingestionJobService.list(),
        ]);
        if (!cancelled) {
          setSources(sources);
          setJobs(jobList);
        }
      } catch {
        // Silently handle error
      }
    };

    init();
    return () => { cancelled = true; };
  }, [setSources, setJobs]);

  // ── Handler: called on successful upload + polling done ──────────────────
  const handleJobComplete = (job: IngestionJobOut) => {
    upsertJob(job);
    toast(
      `✓ "${job.file_name}" ingested — ${job.row_count} canonical rows ingested${job.error_count > 0 ? `, ${job.error_count} failed` : ''}`,
      job.error_count > 0 ? 'warn' : 'ok'
    );
  };

  // ── Handler: view job details (switches to Data Explorer tab) ─────────────
  const handleViewJob = (_jobId: string) => {
    setActiveTab('explorer');
  };



  // ── Handler: retry failed job ─────────────────────────────────────────────
  const handleRetry = async (jobId: string) => {
    try {
      const retried = await ingestionJobService.retry(jobId);
      upsertJob(retried);
      toast('Job reset to PENDING and queued for retry.', 'warn');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Retry failed';
      toast(msg, 'bad');
    }
  };

  // ── Handler: insert manual staging row ───────────────────────────────────
  const handleInsertRow = () => {
    openModal(
      <InsertRowModal
        onClose={closeModal}
        onAdd={(_newRow) => {
          closeModal();
          toast('Manual row added to Data Explorer staging!', 'ok');
        }}
      />,
      'md'
    );
  };

  const handleDeleteRow = (_id: string) => {
    toast('Row deleted from staging', 'warn');
  };

  const handleDeleteMapping = (id: string) => {
    setMappings((prev) => prev.filter((m) => m.id !== id));
    toast('Field mapping removed', 'warn');
  };

  const handleAddMapping = () => {
    const newField: FieldMapping = {
      id: `map-${Date.now()}`,
      ledger: `custom_field_${mappings.length + 1}`,
      required: false,
    };
    setMappings((prev) => [...prev, newField]);
    toast('New schema field added', 'ok');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      <Topbar
        title="Data Integration Hub"
        subtitle="Ingest, map, validate, and normalize source data"
      />

      <TabBar
        tabs={DATA_HUB_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'jobs' && (
          <JobsTab
            jobs={jobs}
            onViewJob={handleViewJob}
            onJobComplete={handleJobComplete}
            onRetry={handleRetry}
          />
        )}

        {activeTab === 'schemas' && (
          <SchemasTab
            mappings={mappings}
            onDeleteMapping={handleDeleteMapping}
            onAddMapping={handleAddMapping}
          />
        )}

        {activeTab === 'explorer' && (
          <DataExplorerTab
            jobs={jobs}
            onInsertRow={handleInsertRow}
            onDeleteRow={handleDeleteRow}
          />
        )}
      </div>
    </div>
  );
};
