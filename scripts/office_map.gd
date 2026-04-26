extends Node2D

const METERS := 15
const PIXELS_PER_METER := 64
const GRID_COLOR := Color(0.82, 0.86, 0.92)
const FLOOR_COLOR := Color(0.95, 0.96, 0.98)
const WALL_COLOR := Color(0.15, 0.18, 0.22)
const ROOM_COLOR := Color(0.84, 0.91, 1.0, 0.5)
const LABEL_COLOR := Color(0.08, 0.11, 0.16)

func _ready() -> void:
	queue_redraw()

func _draw() -> void:
	var map_size := METERS * PIXELS_PER_METER
	var full_rect := Rect2(Vector2.ZERO, Vector2(map_size, map_size))
	draw_rect(full_rect, FLOOR_COLOR, true)

	_draw_grid(map_size)
	_draw_outer_walls(map_size)
	_draw_rooms()
	_draw_legend(map_size)

func _draw_grid(map_size: int) -> void:
	for i in range(METERS + 1):
		var offset := i * PIXELS_PER_METER
		draw_line(Vector2(offset, 0), Vector2(offset, map_size), GRID_COLOR, 1.0)
		draw_line(Vector2(0, offset), Vector2(map_size, offset), GRID_COLOR, 1.0)

func _draw_outer_walls(map_size: int) -> void:
	var thickness := 10.0
	draw_rect(Rect2(0, 0, map_size, thickness), WALL_COLOR, true)
	draw_rect(Rect2(0, map_size - thickness, map_size, thickness), WALL_COLOR, true)
	draw_rect(Rect2(0, 0, thickness, map_size), WALL_COLOR, true)
	draw_rect(Rect2(map_size - thickness, 0, thickness, map_size), WALL_COLOR, true)

func _draw_rooms() -> void:
	# Переговорка: 5x4 м
	_draw_room(Rect2(1, 1, 5, 4), "Переговорка")
	# Open space: 9x8 м
	_draw_room(Rect2(6, 1, 8, 8), "Open Space")
	# Кабинет менеджера: 4x3 м
	_draw_room(Rect2(1, 6, 4, 3), "Кабинет")
	# Кухня: 4x3 м
	_draw_room(Rect2(1, 10, 4, 3), "Кухня")
	# Серверная: 3x2 м
	_draw_room(Rect2(12, 10, 2, 3), "Серверная")
	# Склад: 3x2 м
	_draw_room(Rect2(8, 10, 3, 2), "Склад")

	# Коридорные стены
	_draw_wall_meters(Vector2(5, 1), Vector2(5, 13))
	_draw_wall_meters(Vector2(5, 9), Vector2(14, 9))
	_draw_wall_meters(Vector2(11, 9), Vector2(11, 12))

	# Дверные проемы
	_draw_door(Vector2(5, 3), true)
	_draw_door(Vector2(5, 7), true)
	_draw_door(Vector2(5, 11), true)
	_draw_door(Vector2(9, 9), false)
	_draw_door(Vector2(12, 9), false)

func _draw_room(room_meters: Rect2, title: String) -> void:
	var room_px := Rect2(
		room_meters.position * PIXELS_PER_METER,
		room_meters.size * PIXELS_PER_METER
	)
	draw_rect(room_px, ROOM_COLOR, true)
	draw_rect(room_px, WALL_COLOR, false, 2.0)

	var font := ThemeDB.fallback_font
	if font:
		var font_size := 20
		var text_size := font.get_string_size(title, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size)
		var center := room_px.position + room_px.size * 0.5
		var text_pos := center - Vector2(text_size.x * 0.5, -text_size.y * 0.3)
		draw_string(font, text_pos, title, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, LABEL_COLOR)

func _draw_wall_meters(start_m: Vector2, end_m: Vector2) -> void:
	var thickness := 6.0
	draw_line(start_m * PIXELS_PER_METER, end_m * PIXELS_PER_METER, WALL_COLOR, thickness)

func _draw_door(position_m: Vector2, vertical: bool) -> void:
	var door_size := Vector2(0.9, 0.2) if vertical else Vector2(0.2, 0.9)
	var door_rect := Rect2(
		(position_m - door_size * 0.5) * PIXELS_PER_METER,
		door_size * PIXELS_PER_METER
	)
	draw_rect(door_rect, FLOOR_COLOR, true)
	draw_rect(door_rect, LABEL_COLOR, false, 2.0)

func _draw_legend(map_size: int) -> void:
	var font := ThemeDB.fallback_font
	if not font:
		return

	var text := "Офис 15x15 м | Масштаб: 1 м = %d px" % PIXELS_PER_METER
	draw_string(font, Vector2(16, map_size + 30), text, HORIZONTAL_ALIGNMENT_LEFT, -1, 20, LABEL_COLOR)

	# Габариты карты
	draw_line(Vector2(0, map_size + 48), Vector2(map_size, map_size + 48), LABEL_COLOR, 2.0)
	draw_line(Vector2(0, map_size + 42), Vector2(0, map_size + 54), LABEL_COLOR, 2.0)
	draw_line(Vector2(map_size, map_size + 42), Vector2(map_size, map_size + 54), LABEL_COLOR, 2.0)
	draw_string(font, Vector2(map_size * 0.5 - 45, map_size + 70), "15 м", HORIZONTAL_ALIGNMENT_LEFT, -1, 18, LABEL_COLOR)
