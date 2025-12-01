import { useState, useEffect } from 'react';
import { IconX, IconTable, IconCode } from '@tabler/icons-react';
import type { NodeConfig } from '../../types/index';

interface DataTableModalProps {
  node: NodeConfig | null;
  onUpdate: (nodeId: string, config: Record<string, any>) => void;
  onClose: () => void;
}

export function DataTableModal({ node, onUpdate, onClose }: DataTableModalProps) {
  const [inputData, setInputData] = useState('');
  const [parseConfig, setParseConfig] = useState({
    delimiter: ',',
    hasHeader: true,
    skipRows: 0
  });
  const [outputView, setOutputView] = useState<'table' | 'json'>('table');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (node?.config.data) {
      const data = typeof node.config.data === 'string' ? node.config.data : JSON.stringify(node.config.data, null, 2);
      setInputData(data);
      parseData(data);
    }
  }, [node]);

  const parseData = (data: string) => {
    try {
      setParseError(null);
      
      // Try to parse as JSON first
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        setParsedData(parsed);
      } else {
        setParsedData([parsed]);
      }
    } catch (e) {
      // If JSON parsing fails, try CSV parsing
      try {
        const rows = data.trim().split('\n').slice(parseConfig.skipRows);
        if (rows.length === 0) {
          setParsedData([]);
          return;
        }

        const delimiter = parseConfig.delimiter;
        let headers: string[] = [];
        let dataRows: string[][] = [];

        if (parseConfig.hasHeader && rows[0]) {
          headers = rows[0].split(delimiter).map(h => h.trim());
          dataRows = rows.slice(1).map(row => row.split(delimiter).map(cell => cell.trim()));
        } else if (rows[0]) {
          // Generate headers like Col1, Col2, etc.
          const firstRow = rows[0].split(delimiter);
          headers = firstRow.map((_, i) => `Col${i + 1}`);
          dataRows = rows.map(row => row.split(delimiter).map(cell => cell.trim()));
        }

        const result = dataRows.map(row => {
          const obj: any = {};
          headers.forEach((header, i) => {
            obj[header] = row[i] || '';
          });
          return obj;
        });

        setParsedData(result);
      } catch (csvError) {
        setParseError(`Failed to parse data: ${(csvError as Error).message}`);
        setParsedData([]);
      }
    }
  };

  const handleInputChange = (value: string) => {
    setInputData(value);
    parseData(value);
  };

  const handleSave = () => {
    if (node) {
      onUpdate(node.id, { ...node.config, data: inputData });
      onClose();
    }
  };

  if (!node) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full h-[90vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <IconTable size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{node.name}</h2>
              <p className="text-xs text-gray-500">Data Table Configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-transparent"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
              title="Close"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Input */}
          <div className="w-96 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Input Data
              </h3>
              <p className="text-xs text-gray-500 mt-1">JSON or CSV format</p>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <textarea
                value={inputData}
                onChange={(e) => handleInputChange(e.target.value)}
                className="w-full h-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                placeholder='[\n  {"name": "Item 1", "value": 100},\n  {"name": "Item 2", "value": 200}\n]\n\nOr CSV:\nname,value\nItem 1,100\nItem 2,200'
              />
            </div>
          </div>

          {/* Center: Parse Config */}
          <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                Parse Configuration
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  CSV Delimiter
                </label>
                <input
                  type="text"
                  value={parseConfig.delimiter}
                  onChange={(e) => {
                    const newConfig = { ...parseConfig, delimiter: e.target.value };
                    setParseConfig(newConfig);
                    parseData(inputData);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder=","
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={parseConfig.hasHeader}
                    onChange={(e) => {
                      const newConfig = { ...parseConfig, hasHeader: e.target.checked };
                      setParseConfig(newConfig);
                      parseData(inputData);
                    }}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">First row is header</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Skip Rows
                </label>
                <input
                  type="number"
                  value={parseConfig.skipRows}
                  onChange={(e) => {
                    const newConfig = { ...parseConfig, skipRows: parseInt(e.target.value) || 0 };
                    setParseConfig(newConfig);
                    parseData(inputData);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="0"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">Data Info</div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>Rows: {parsedData.length}</div>
                  <div>Columns: {parsedData[0] ? Object.keys(parsedData[0]).length : 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Output */}
          <div className="flex-1 flex flex-col bg-gray-50">
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Output Preview
              </h3>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setOutputView('table')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    outputView === 'table'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <IconTable size={14} className="inline mr-1" />
                  Table
                </button>
                <button
                  onClick={() => setOutputView('json')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    outputView === 'json'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <IconCode size={14} className="inline mr-1" />
                  JSON
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {parseError ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {parseError}
                </div>
              ) : parsedData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <IconTable size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No data to display</p>
                  </div>
                </div>
              ) : outputView === 'table' ? (
                <div className="overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-100">
                      <tr>
                        {Object.keys(parsedData[0]).map((key) => (
                          <th
                            key={key}
                            className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedData.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row).map((value: any, j) => (
                            <td
                              key={j}
                              className="px-4 py-2 text-xs text-gray-700 border-r border-gray-200 last:border-r-0"
                            >
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <pre className="text-xs font-mono bg-white border border-gray-300 rounded-md p-4 overflow-auto">
                  {JSON.stringify(parsedData, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
