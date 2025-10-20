import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Room {
  id: string;
  name: string;
  workspace_id: string | null;
  created_by: string | null;
  created_at: string;
}

interface RoomsSidebarProps {
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
}

export function RoomsSidebar({ selectedRoomId, onRoomSelect }: RoomsSidebarProps) {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [renamingRoom, setRenamingRoom] = useState<Room | null>(null);

  // Fetch rooms
  const { data: roomsData } = useQuery<{ rooms: Room[] }>({
    queryKey: ['/api/rooms'],
  });

  const rooms = roomsData?.rooms || [];

  // Create room mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', '/api/rooms', { name });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      setIsCreateOpen(false);
      setNewRoomName('');
      onRoomSelect(data.room.id);
      toast({
        title: 'Room created',
        description: `Created "${data.room.name}"`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create room',
        variant: 'destructive',
      });
    },
  });

  // Rename room mutation
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiRequest('PATCH', `/api/rooms/${id}`, { name });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      setIsRenameOpen(false);
      setRenamingRoom(null);
      setNewRoomName('');
      toast({
        title: 'Room renamed',
        description: `Renamed to "${data.room.name}"`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to rename room',
        variant: 'destructive',
      });
    },
  });

  // Delete room mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/rooms/${id}`);
      return res.json();
    },
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      if (selectedRoomId === deletedId) {
        // Select first available room or null
        const remainingRooms = rooms.filter(r => r.id !== deletedId);
        onRoomSelect(remainingRooms.length > 0 ? remainingRooms[0].id : '');
      }
      toast({
        title: 'Room deleted',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete room',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    if (newRoomName.trim()) {
      createMutation.mutate(newRoomName.trim());
    }
  };

  const handleRename = () => {
    if (renamingRoom && newRoomName.trim()) {
      renameMutation.mutate({ id: renamingRoom.id, name: newRoomName.trim() });
    }
  };

  const openRenameDialog = (room: Room) => {
    setRenamingRoom(room);
    setNewRoomName(room.name);
    setIsRenameOpen(true);
  };

  const handleDelete = (room: Room) => {
    if (confirm(`Delete "${room.name}"?`)) {
      deleteMutation.mutate(room.id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Rooms
          </h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsCreateOpen(true)}
            data-testid="button-create-room"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto p-2">
        {rooms.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No rooms yet. Create one to start chatting.
          </div>
        ) : (
          <div className="space-y-1">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`
                  group flex items-center gap-2 p-2 rounded-md cursor-pointer
                  hover-elevate active-elevate-2
                  ${selectedRoomId === room.id ? 'bg-sidebar-accent' : ''}
                `}
                onClick={() => onRoomSelect(room.id)}
                data-testid={`room-item-${room.id}`}
              >
                <div className="flex-1 truncate text-sm">
                  {room.name}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRenameDialog(room);
                    }}
                    data-testid={`button-rename-room-${room.id}`}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(room);
                    }}
                    data-testid={`button-delete-room-${room.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                placeholder="Enter room name..."
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate();
                  }
                }}
                data-testid="input-create-room-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setNewRoomName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newRoomName.trim() || createMutation.isPending}
              data-testid="button-confirm-create-room"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Room Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-room">Room Name</Label>
              <Input
                id="rename-room"
                placeholder="Enter new name..."
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRename();
                  }
                }}
                data-testid="input-rename-room-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRenameOpen(false);
                setRenamingRoom(null);
                setNewRoomName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={!newRoomName.trim() || renameMutation.isPending}
              data-testid="button-confirm-rename-room"
            >
              {renameMutation.isPending ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
