import React, { useState, useEffect } from 'react';
import { webinarApi } from '../services/api';
import type { WebinarHost, CSVUploadResponse } from '../services/api';
import { useToast } from '../hooks/useToast';
import '../components/WebinarDashboardSection.css';

interface WebinarCSVUploadProps {
  onUploadSuccess: () => void;
}

const WebinarCSVUpload: React.FC<WebinarCSVUploadProps> = ({ onUploadSuccess }) => {
  const [webinarName, setWebinarName] = useState('');
  const [webinarHost, setWebinarHost] = useState('');
  const [customHost, setCustomHost] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [hosts, setHosts] = useState<WebinarHost[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingHosts, setIsLoadingHosts] = useState(true);
  const { success, error } = useToast();

  useEffect(() => {
    loadHosts();
  }, []);

  const loadHosts = async () => {
    try {
      const hostsData = await webinarApi.getWebinarHosts();
      setHosts(hostsData);
    } catch (err) {
      console.error('Failed to load hosts:', err);
    } finally {
      setIsLoadingHosts(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setCsvFile(file);
    } else {
      error('Invalid file type', 'Please select a CSV file');
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!webinarName.trim()) {
      error('Validation Error', 'Please enter a webinar name');
      return;
    }

    const finalHost = webinarHost === 'custom' ? customHost : webinarHost;
    if (!finalHost.trim()) {
      error('Validation Error', 'Please select or enter a webinar host');
      return;
    }

    if (!csvFile) {
      error('Validation Error', 'Please select a CSV file');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      formData.append('webinarName', webinarName.trim());
      formData.append('webinarHost', finalHost.trim());

      const result: CSVUploadResponse = await webinarApi.uploadCSV(formData);

      if (result.success) {
        success(
          'Upload Successful!',
          `Imported ${result.attendees_imported} attendees (${result.attendees_filtered} filtered)`
        );
        setWebinarName('');
        setWebinarHost('');
        setCustomHost('');
        setCsvFile(null);
        onUploadSuccess();
        loadHosts(); // Refresh hosts list in case a new one was added
      } else {
        error('Upload Failed', result.message);
      }
    } catch (err) {
      console.error('Upload error:', err);
      error(
        'Upload Failed',
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="webinar-upload-section">
      <div className="upload-form-container">
        <h3>Upload Webinar Attendance CSV</h3>
        <p className="upload-description">
          Upload a CSV file containing webinar attendance data. The system will automatically
          exclude Fathom NoteTaker entries and track attendance metrics.
        </p>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label htmlFor="webinar-name" className="form-label">
              Webinar Name *
            </label>
            <input
              type="text"
              id="webinar-name"
              value={webinarName}
              onChange={(e) => setWebinarName(e.target.value)}
              placeholder="Enter webinar name"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="webinar-host" className="form-label">
              Webinar Host *
            </label>
            <select
              id="webinar-host"
              value={webinarHost}
              onChange={(e) => setWebinarHost(e.target.value)}
              className="form-select"
              required
            >
              <option value="">Select a host...</option>
              {isLoadingHosts ? (
                <option disabled>Loading hosts...</option>
              ) : (
                hosts.map((host) => (
                  <option key={host.id} value={host.name}>
                    {host.name} ({host.webinar_count} webinars, {host.total_attendees} attendees)
                  </option>
                ))
              )}
              <option value="custom">Add new host...</option>
            </select>
          </div>

          {webinarHost === 'custom' && (
            <div className="form-group">
              <label htmlFor="custom-host" className="form-label">
                New Host Name *
              </label>
              <input
                type="text"
                id="custom-host"
                value={customHost}
                onChange={(e) => setCustomHost(e.target.value)}
                placeholder="Enter new host name"
                className="form-input"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="csv-file" className="form-label">
              CSV File *
            </label>
            <input
              type="file"
              id="csv-file"
              accept=".csv"
              onChange={handleFileChange}
              className="form-file-input"
              required
            />
            {csvFile && (
              <div className="file-info">
                <span className="file-name">📄 {csvFile.name}</span>
                <span className="file-size">({(csvFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="upload-button"
          >
            {isUploading ? (
              <>
                <span className="spinner">⏳</span>
                Processing CSV...
              </>
            ) : (
              <>
                <span>📤</span>
                Upload & Process
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WebinarCSVUpload;
