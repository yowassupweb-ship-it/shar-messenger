import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, generateId } from '@/lib/dataStore';

interface ClusterType {
  id: string;
  name: string;
}

interface Cluster {
  id: string;
  name: string;
  types: ClusterType[];
}

interface ClustersData {
  clusters: Cluster[];
}

export async function GET() {
  try {
    const data = readJsonFile<ClustersData>('clusters.json', { clusters: [] });
    
    // Сортировка по имени
    data.clusters.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    return NextResponse.json(data.clusters);
  } catch (error) {
    console.error('Error reading clusters:', error);
    return NextResponse.json([]);
  }
}

// Создание нового кластера или подкластера
export async function POST(request: Request) {
  try {
    const { name, parentClusterId } = await request.json();
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const data = readJsonFile<ClustersData>('clusters.json', { clusters: [] });

    if (parentClusterId) {
      // Создаём подкластер
      const cluster = data.clusters.find(c => c.id === parentClusterId);
      if (!cluster) {
        return NextResponse.json({ error: 'Parent cluster not found' }, { status: 404 });
      }
      
      const subclusterId = `${parentClusterId}/${name}`;
      if (cluster.types.some(t => t.id === subclusterId)) {
        return NextResponse.json({ error: 'Subcluster already exists' }, { status: 400 });
      }
      
      cluster.types.push({
        id: subclusterId,
        name,
      });
      
      writeJsonFile('clusters.json', data);
      return NextResponse.json({ 
        id: subclusterId,
        name,
      });
    } else {
      // Создаём новый кластер
      const existingClusters = data.clusters.filter(c => c.name.startsWith('Кластер'));
      const nextNum = existingClusters.length + 1;
      const clusterName = name.startsWith('Кластер') ? name : `Кластер ${nextNum} - ${name}`;
      const clusterId = generateId();
      
      if (data.clusters.some(c => c.name === clusterName)) {
        return NextResponse.json({ error: 'Cluster already exists' }, { status: 400 });
      }
      
      const newCluster: Cluster = {
        id: clusterId,
        name: clusterName,
        types: [],
      };
      
      data.clusters.push(newCluster);
      writeJsonFile('clusters.json', data);
      
      return NextResponse.json(newCluster);
    }
  } catch (error) {
    console.error('Error creating cluster:', error);
    return NextResponse.json({ error: 'Failed to create cluster' }, { status: 500 });
  }
}

// Переименование кластера или подкластера
export async function PUT(request: Request) {
  try {
    const { id, newName, isSubcluster, parentClusterId } = await request.json();
    
    if (!id || !newName) {
      return NextResponse.json({ error: 'ID and new name are required' }, { status: 400 });
    }

    const data = readJsonFile<ClustersData>('clusters.json', { clusters: [] });

    if (isSubcluster && parentClusterId) {
      // Переименование подкластера
      const cluster = data.clusters.find(c => c.id === parentClusterId);
      if (!cluster) {
        return NextResponse.json({ error: 'Parent cluster not found' }, { status: 404 });
      }
      
      const subcluster = cluster.types.find(t => t.id === id);
      if (!subcluster) {
        return NextResponse.json({ error: 'Subcluster not found' }, { status: 404 });
      }
      
      const newId = `${parentClusterId}/${newName}`;
      subcluster.id = newId;
      subcluster.name = newName;
      
      writeJsonFile('clusters.json', data);
      return NextResponse.json({ success: true, newId });
    } else {
      // Переименование кластера
      const cluster = data.clusters.find(c => c.id === id);
      if (!cluster) {
        return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
      }
      
      cluster.name = newName;
      
      writeJsonFile('clusters.json', data);
      return NextResponse.json({ success: true, newId: id });
    }
  } catch (error) {
    console.error('Error renaming cluster:', error);
    return NextResponse.json({ error: 'Failed to rename cluster' }, { status: 500 });
  }
}

// Удаление кластера или подкластера
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const isSubcluster = searchParams.get('isSubcluster') === 'true';
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const data = readJsonFile<ClustersData>('clusters.json', { clusters: [] });

    if (isSubcluster) {
      // Удаление подкластера
      const parts = id.split('/');
      const parentId = parts.slice(0, -1).join('/');
      const cluster = data.clusters.find(c => c.id === parentId);
      
      if (!cluster) {
        return NextResponse.json({ error: 'Parent cluster not found' }, { status: 404 });
      }
      
      cluster.types = cluster.types.filter(t => t.id !== id);
    } else {
      // Удаление кластера
      data.clusters = data.clusters.filter(c => c.id !== id);
    }
    
    writeJsonFile('clusters.json', data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cluster:', error);
    return NextResponse.json({ error: 'Failed to delete cluster' }, { status: 500 });
  }
}
