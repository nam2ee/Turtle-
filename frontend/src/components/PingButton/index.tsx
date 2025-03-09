"use client";

import { FC, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getDAOPdaList, getDAOMetadata, getAllDAOStates, PROGRAM_ID } from '@/utils/solana-program';
import { useWalletNetwork } from '@/hooks/useWalletNetwork';

export const PingButton: FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { isDevnet, isChecking } = useWalletNetwork();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [networkWarning, setNetworkWarning] = useState<string | null>(
    isDevnet === false ? "Warning: Your wallet is not connected to Devnet" : null
  );

  const pingDAOApi = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Pinging DAO API...');
      const pdaList = await getDAOPdaList();
      setResult({
        type: 'DAO PDA List',
        data: pdaList
      });
    } catch (err) {
      console.error('Error pinging DAO API:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchSingleDAO = async () => {
    if (!connection) {
      setError("Connection not available");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching DAO PDA list first...');
      const pdaList = await getDAOPdaList();
      
      if (pdaList.length === 0) {
        setError('No DAOs found in the API');
        setIsLoading(false);
        return;
      }
      
      console.log(`Fetching data for first DAO: ${pdaList[0]}`);
      const daoMetadata = await getDAOMetadata(pdaList[0], connection);
      
      setResult({
        type: 'Single DAO Metadata',
        address: pdaList[0],
        data: daoMetadata
      });
    } catch (err) {
      console.error('Error fetching DAO metadata:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchAllDAOs = async () => {
    if (!connection) {
      setError("Connection not available");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching DAO PDA list...');
      const pdaList = await getDAOPdaList();
      
      if (pdaList.length === 0) {
        setError('No DAOs found in the API');
        setIsLoading(false);
        return;
      }
      
      console.log(`Fetching data for all ${pdaList.length} DAOs...`);
      const allDAOStates = await getAllDAOStates(pdaList, connection);
      
      setResult({
        type: 'All DAO States',
        count: allDAOStates.length,
        data: allDAOStates
      });
    } catch (err) {
      console.error('Error fetching all DAO states:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchProgramInfo = async () => {
    if (!connection) {
      setError("Connection not available");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching program info for: ${PROGRAM_ID.toString()}`);
      const accountInfo = await connection.getAccountInfo(PROGRAM_ID);
      
      if (!accountInfo) {
        setError(`Program not found: ${PROGRAM_ID.toString()}`);
        setIsLoading(false);
        return;
      }
      
      setResult({
        type: 'Program Info',
        address: PROGRAM_ID.toString(),
        data: {
          executable: accountInfo.executable,
          owner: accountInfo.owner.toString(),
          lamports: accountInfo.lamports,
          dataSize: accountInfo.data.length
        }
      });
    } catch (err) {
      console.error('Error fetching program info:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
      <h2 className="text-lg font-semibold mb-4">DAO Diagnostics</h2>
      
      {isChecking ? (
        <div className="text-sm mb-4">Checking wallet network...</div>
      ) : networkWarning ? (
        <div className="text-orange-500 text-sm mb-4">{networkWarning}</div>
      ) : wallet.publicKey && isDevnet && (
        <div className="text-green-500 text-sm mb-4">Wallet connected to Devnet ✅</div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-4">
        <button 
          onClick={pingDAOApi} 
          disabled={isLoading}
          className={`px-4 py-2 rounded font-bold text-white 
            ${isLoading 
              ? 'bg-gray-500 cursor-wait' 
              : 'bg-blue-500 hover:bg-blue-600'
            }`}
        >
          {isLoading ? 'Loading...' : 'Get DAO PDA List'}
        </button>
        
        <button 
          onClick={fetchSingleDAO} 
          disabled={isLoading}
          className={`px-4 py-2 rounded font-bold text-white 
            ${isLoading 
              ? 'bg-gray-500 cursor-wait' 
              : 'bg-green-500 hover:bg-green-600'
            }`}
        >
          {isLoading ? 'Loading...' : 'Get Single DAO'}
        </button>
        
        <button 
          onClick={fetchAllDAOs} 
          disabled={isLoading}
          className={`px-4 py-2 rounded font-bold text-white 
            ${isLoading 
              ? 'bg-gray-500 cursor-wait' 
              : 'bg-purple-500 hover:bg-purple-600'
            }`}
        >
          {isLoading ? 'Loading...' : 'Get All DAOs'}
        </button>
        
        <button 
          onClick={fetchProgramInfo} 
          disabled={isLoading}
          className={`px-4 py-2 rounded font-bold text-white 
            ${isLoading 
              ? 'bg-gray-500 cursor-wait' 
              : 'bg-yellow-500 hover:bg-yellow-600'
            }`}
        >
          {isLoading ? 'Loading...' : 'Get Program Info'}
        </button>
      </div>
      
      {error && (
        <div className="w-full p-3 bg-red-800 text-white rounded mb-4">
          {error}
        </div>
      )}
      
      {result && (
        <div className="w-full p-3 bg-gray-700 rounded overflow-auto max-h-96">
          <h3 className="font-bold mb-2">{result.type} Result:</h3>
          <pre className="text-xs whitespace-pre-wrap break-all">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PingButton;