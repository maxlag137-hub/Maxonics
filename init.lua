-- Machine Gun Starter Wand
-- Put this file next to mod.xml in a folder inside Noita/mods/.

local STARTER_SPELLS = {
  "BLACK_HOLE",
  "CHAIN_BOLT",
}

local function get_all_children_recursive(entity_id, result)
  result = result or {}

  local children = EntityGetAllChildren(entity_id) or {}
  for _, child_id in ipairs(children) do
    result[#result + 1] = child_id
    get_all_children_recursive(child_id, result)
  end

  return result
end

local function is_wand(entity_id)
  if EntityHasTag(entity_id, "wand") then
    return true
  end

  local ability_component = EntityGetFirstComponentIncludingDisabled(entity_id, "AbilityComponent")
  if ability_component == nil then
    return false
  end

  return ComponentGetValue2(ability_component, "use_gun_script") == true
end

local function find_first_wand(player_entity)
  local children = get_all_children_recursive(player_entity)

  for _, child_id in ipairs(children) do
    if is_wand(child_id) then
      return child_id
    end
  end

  return nil
end

local function remove_spells_from_wand(wand_entity)
  local children = EntityGetAllChildren(wand_entity) or {}

  for _, child_id in ipairs(children) do
    if EntityGetFirstComponentIncludingDisabled(child_id, "ItemActionComponent") ~= nil then
      EntityKill(child_id)
    end
  end
end

local function add_spells_to_wand(wand_entity, spell_ids)
  local x, y = EntityGetTransform(wand_entity)

  for slot, spell_id in ipairs(spell_ids) do
    local spell_entity = CreateItemActionEntity(spell_id, x, y)
    EntityAddChild(wand_entity, spell_entity)

    local item_component = EntityGetFirstComponentIncludingDisabled(spell_entity, "ItemComponent")
    if item_component ~= nil then
      ComponentSetValue2(item_component, "inventory_slot", slot - 1, 0)
    end
  end
end

local function tune_wand(wand_entity)
  local ability_component = EntityGetFirstComponentIncludingDisabled(wand_entity, "AbilityComponent")
  if ability_component == nil then
    return
  end

  -- Noita stores wand timing in frames. 0 means no cast delay and no recharge time.
  ComponentSetValue2(ability_component, "fire_rate_wait", 0)
  ComponentSetValue2(ability_component, "reload_time", 0)

  ComponentSetValue2(ability_component, "mana_max", 9999)
  ComponentSetValue2(ability_component, "mana", 9999)
  ComponentSetValue2(ability_component, "mana_charge_speed", 9999)
end

function OnPlayerSpawned(player_entity)
  if GameHasFlagRun("machine_gun_starter_wand_done") then
    return
  end

  GameAddFlagRun("machine_gun_starter_wand_done")

  local wand_entity = find_first_wand(player_entity)
  if wand_entity == nil then
    return
  end

  tune_wand(wand_entity)
  remove_spells_from_wand(wand_entity)
  add_spells_to_wand(wand_entity, STARTER_SPELLS)
end
