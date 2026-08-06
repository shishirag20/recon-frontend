import React, { useState } from 'react';
import { Topbar } from '../components/layout/Topbar';
import { TabBar, type TabItem } from '../components/layout/TabBar';
import { JobsTab } from '../components/data-hub/JobsTab';
import { SchemasTab } from '../components/data-hub/SchemasTab';
import { DataExplorerTab } from '../components/data-hub/DataExplorerTab';
import { ColumnMappingModal } from '../components/data-hub/ColumnMappingModal';
import { InsertRowModal } from '../components/data-hub/InsertRowModal';
import { JobDataModal } from '../components/data-hub/JobDataModal';
import { MOCK_JOBS, MOCK_STAGING, MOCK_MAPPINGS } from '../mocks/data-hub';
import { useModal } from '../hooks/useModal';
import { useToast } from '../hooks/useToast';
import type { Job, StagingRow, FieldMapping } from '../types';

const DATA_HUB_TABS: TabItem[] = [
  { key: 'jobs', label: 'Ingestion Jobs', badge: MOCK_JOBS.length },
  { key: 'schemas', label: 'Schemas & Validation', badge: MOCK_MAPPINGS.length },
  { key: 'explorer', label: 'Data Explorer', badge: MOCK_STAGING.length },
];

export const DataHubPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [rows, setRows] = useState<StagingRow[]>(MOCK_STAGING);
  const [mappings, setMappings] = useState<FieldMapping[]>(MOCK_MAPPINGS);

  const { openModal, closeModal } = useModal();
  const { toast } = useToast();

  const handleFileUploaded = (file: File, category?: string) => {
    openModal(
      <ColumnMappingModal
        fileName={file.name}
        onClose={closeModal}
        onConfirm={() => {
          closeModal();
          const targetCat = category || 'Bank Statements';
          const newJob: Job = {
            id: `JOB-${Math.floor(100 + Math.random() * 900)}`,
            source: file.name,
            category: targetCat,
            kind: 'manual',
            format: file.name.endsWith('.xls') || file.name.endsWith('.xlsx') ? 'XLS' : 'CSV',
            rows: 150,
            errors: 0,
            status: 'success',
            at: new Date().toISOString(),
          };
          setJobs((prev) => [newJob, ...prev]);
          toast(`File "${file.name}" ingested under "${targetCat}" with 150 rows!`, 'ok');
        }}
      />,
      'lg'
    );
  };

  const handleViewJob = (jobId: string) => {
    const target = jobs.find((j) => j.id === jobId);
    if (!target) return;
    openModal(<JobDataModal job={target} onClose={closeModal} />, '2xl');
  };

  const handleInsertRow = () => {
    openModal(
      <InsertRowModal
        onClose={closeModal}
        onAdd={(newRow) => {
          closeModal();
          const stagingObj: StagingRow = {
            id: `STG-${Math.floor(100 + Math.random() * 900)}`,
            jobId: jobs[0]?.id || 'JOB-901',
            sourceLabel: 'Manual Entry',
            category: 'Manual',
            status: 'mapped',
            rowData: { ...newRow },
            txnId: `MAN-${Math.floor(1000 + Math.random() * 9000)}`,
            date: newRow.date,
            reference: newRow.reference || 'MANUAL-REF',
            counterparty: newRow.description,
            description: newRow.description,
            amount: parseFloat(newRow.amount) || 0,
            currency: newRow.currency,
          };
          setRows((prev) => [stagingObj, ...prev]);
          toast('Manual row added to Data Explorer staging!', 'ok');
        }}
      />,
      'md'
    );
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
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
            onFileUploaded={handleFileUploaded}
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
            rows={rows}
            onInsertRow={handleInsertRow}
            onDeleteRow={handleDeleteRow}
          />
        )}
      </div>
    </div>
  );
};
