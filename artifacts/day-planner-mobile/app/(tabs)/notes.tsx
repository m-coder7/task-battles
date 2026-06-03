import { Feather } from "@expo/vector-icons";
import React, { useState, useCallback } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useNotes, type Note } from "@/hooks/useNotes";
import { format, parseISO } from "date-fns";

const COLORS: Note["color"][] = ["default", "yellow", "green", "blue", "pink", "purple"];

const COLOR_BG: Record<Note["color"], string> = {
  default: "transparent",
  yellow:  "#FEF9C3",
  green:   "#DCFCE7",
  blue:    "#DBEAFE",
  pink:    "#FCE7F3",
  purple:  "#F3E8FF",
};
const COLOR_DARK: Record<Note["color"], string> = {
  default: "transparent",
  yellow:  "#713F12",
  green:   "#14532D",
  blue:    "#1E3A5F",
  pink:    "#831843",
  purple:  "#4C1D95",
};
const DOT_COLORS: Record<Note["color"], string> = {
  default: "#94A3B8",
  yellow:  "#EAB308",
  green:   "#22C55E",
  blue:    "#3B82F6",
  pink:    "#EC4899",
  purple:  "#A855F7",
};

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notes, addNote, updateNote, deleteNote, togglePin } = useNotes();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const filtered = notes.filter((n) =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
  );
  const activeNote = notes.find((n) => n.id === activeId) ?? null;

  const handleNew = useCallback(() => {
    const id = addNote({ title: "", content: "", color: "default", pinned: false });
    setActiveId(id);
  }, [addNote]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert("Delete Note", "Delete this note?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deleteNote(id); if (activeId === id) setActiveId(null); } },
    ]);
  }, [deleteNote, activeId]);

  if (activeNote) {
    return (
      <NoteEditor
        note={activeNote}
        topPad={topPad}
        colors={colors}
        onBack={() => setActiveId(null)}
        onUpdate={(data) => updateNote(activeNote.id, data)}
        onDelete={() => handleDelete(activeNote.id)}
        onTogglePin={() => togglePin(activeNote.id)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Notes
        </Text>
        <TouchableOpacity onPress={handleNew} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          placeholder="Search notes…"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomPad }]}
      >
        {filtered.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <Feather name="file-text" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {search ? "No matching notes" : "No notes yet"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {search ? "Try a different search" : "Tap + to create your first note"}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                colors={colors}
                onPress={() => setActiveId(note.id)}
                onPin={() => togglePin(note.id)}
                onDelete={() => handleDelete(note.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface NoteCardProps {
  note: Note;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onPress: () => void;
  onPin: () => void;
  onDelete: () => void;
}

function NoteCard({ note, colors, onPress, onPin, onDelete }: NoteCardProps) {
  const isDark = colors.background === "#0F0F0F" || colors.background === "#09090B";
  const bgColor = isDark ? COLOR_DARK[note.color] : COLOR_BG[note.color];
  const cardBg = bgColor !== "transparent" ? bgColor : colors.card;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}
    >
      {note.pinned && (
        <View style={styles.pinBadge}>
          <Feather name="bookmark" size={10} color={colors.primary} />
        </View>
      )}
      {note.title ? (
        <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {note.title}
        </Text>
      ) : null}
      <Text style={[styles.cardContent, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={6}>
        {note.content || "Empty note"}
      </Text>
      <Text style={[styles.cardDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {format(parseISO(note.updatedAt), "MMM d")}
      </Text>
    </TouchableOpacity>
  );
}

interface NoteEditorProps {
  note: Note;
  topPad: number;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onBack: () => void;
  onUpdate: (data: Partial<Omit<Note, "id" | "createdAt">>) => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

function NoteEditor({ note, topPad, colors, onBack, onUpdate, onDelete, onTogglePin }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.editorHeader, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { onUpdate({ title, content }); onBack(); }} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => onUpdate({ color: c })}
              style={[styles.colorDot, { backgroundColor: DOT_COLORS[c], borderWidth: note.color === c ? 2 : 0, borderColor: colors.foreground }]}
            />
          ))}
        </View>
        <TouchableOpacity onPress={onTogglePin} style={styles.iconBtn}>
          <Feather name="bookmark" size={18} color={note.pinned ? colors.primary : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.iconBtn}>
          <Feather name="trash-2" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles.editorTitle, { color: colors.foreground, borderBottomColor: colors.border, fontFamily: "Inter_700Bold" }]}
        placeholder="Title"
        placeholderTextColor={colors.mutedForeground}
        value={title}
        onChangeText={setTitle}
        onBlur={() => onUpdate({ title })}
        returnKeyType="next"
      />

      <TextInput
        style={[styles.editorContent, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
        placeholder="Start writing…"
        placeholderTextColor={colors.mutedForeground}
        value={content}
        onChangeText={setContent}
        onBlur={() => onUpdate({ content })}
        multiline
        textAlignVertical="top"
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 26 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  scroll: { paddingHorizontal: 12, paddingTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  card: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
    minHeight: 100,
    position: "relative",
  },
  pinBadge: { position: "absolute", top: 8, right: 8 },
  cardTitle: { fontSize: 13, marginBottom: 2 },
  cardContent: { fontSize: 12, lineHeight: 17, flex: 1 },
  cardDate: { fontSize: 10, marginTop: 4 },
  emptyState: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, marginTop: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { padding: 4 },
  colorRow: { flex: 1, flexDirection: "row", gap: 8, justifyContent: "center" },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  iconBtn: { padding: 4 },
  editorTitle: {
    fontSize: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  editorContent: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 20,
    paddingVertical: 12,
    lineHeight: 24,
  },
});
