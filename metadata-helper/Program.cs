using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;

namespace PlrForge.Metadata
{
    internal static class Program
    {
        private const int SchemaVersion = 1;

        private static Assembly _terraria;
        private static string _terrariaDirectory;

        public static int Main(string[] args)
        {
            if (args.Length < 2 || args.Length > 3)
            {
                Console.Error.WriteLine("Usage: PlrForge.Metadata <Terraria.exe> <output.json> [item:prefix,...]");
                return 2;
            }

            try
            {
                Extract(Path.GetFullPath(args[0]), Path.GetFullPath(args[1]), args.Length == 3 ? ParseRequests(args[2]) : null);
                return 0;
            }
            catch (Exception error)
            {
                Console.Error.WriteLine(error.GetBaseException().ToString());
                return 1;
            }
        }

        private static void Extract(string terrariaPath, string outputPath, List<ItemRequest> requests)
        {
            _terrariaDirectory = Path.GetDirectoryName(terrariaPath);
            _terraria = Assembly.LoadFrom(terrariaPath);
            AppDomain.CurrentDomain.AssemblyResolve += ResolveTerrariaDependency;

            var localization = ReadItemLocalization(_terraria);
            var itemIdType = RequiredType("Terraria.ID.ItemID");
            var keysById = ReadItemKeys(itemIdType);
            var itemCount = ReadItemCount(itemIdType, keysById);

            // Main's static initializer expects Terraria.Program.SavePath to be populated. Setting
            // it prevents game-save discovery while still allowing Item.SetDefaults to run.
            var programType = RequiredType("Terraria.Program");
            var savePath = programType.GetField("SavePath", AllStatic);
            if (savePath != null && !savePath.IsLiteral)
                savePath.SetValue(null, Path.GetTempPath());

            var itemType = RequiredType("Terraria.Item");
            var setDefaults = itemType.GetMethod("SetDefaults", BindingFlags.Public | BindingFlags.Instance);
            if (setDefaults == null)
                throw new MissingMethodException("Terraria.Item.SetDefaults was not found.");
            var applyPrefix = itemType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .FirstOrDefault(method => method.Name == "Prefix" && method.GetParameters().Length == 1);
            var canRollPrefix = itemType.GetMethod("CanRollPrefix", BindingFlags.Public | BindingFlags.Instance);
            var prefixMultipliers = itemType.GetMethod("TryGetPrefixStatMultipliersForItem", BindingFlags.Public | BindingFlags.Instance);

            var temporary = outputPath + ".tmp";
            Directory.CreateDirectory(Path.GetDirectoryName(outputPath));
            using (var stream = new FileStream(temporary, FileMode.Create, FileAccess.Write, FileShare.None))
            using (var writer = new StreamWriter(stream, new UTF8Encoding(false)))
            {
                writer.Write("{\"schemaVersion\":");
                writer.Write(SchemaVersion);
                writer.Write(",\"terrariaVersion\":");
                WriteString(writer, _terraria.GetName().Version.ToString());
                writer.Write(",\"items\":[");

                var wroteItem = false;
                IEnumerable<ItemRequest> itemRequests = requests != null
                    ? requests
                    : Enumerable.Range(1, itemCount - 1).Select(id => new ItemRequest(id, 0));
                foreach (var request in itemRequests)
                {
                    var id = request.Id;
                    if (id <= 0 || id >= itemCount)
                        continue;
                    object item;
                    PrefixDetails prefixDetails;
                    try
                    {
                        item = Activator.CreateInstance(itemType);
                        setDefaults.Invoke(item, new object[] { id, null });
                        prefixDetails = request.Prefix > 0
                            ? ReadPrefixDetails(itemType, item, request.Prefix, canRollPrefix, prefixMultipliers)
                            : null;
                        if (request.Prefix > 0 && applyPrefix != null && (prefixDetails == null || prefixDetails.CanRollPrefix))
                            applyPrefix.Invoke(item, new object[] { request.Prefix });
                    }
                    catch
                    {
                        continue;
                    }

                    var actualType = ReadInt(itemType, item, "type");
                    if (actualType <= 0)
                        continue;

                    if (wroteItem)
                        writer.Write(',');
                    wroteItem = true;
                    WriteItem(writer, itemType, item, id, SelectKey(keysById, localization, id), localization, prefixDetails);
                }

                writer.Write("]}");
            }

            if (File.Exists(outputPath))
                File.Delete(outputPath);
            File.Move(temporary, outputPath);
        }

        private static List<ItemRequest> ParseRequests(string value)
        {
            var requests = new List<ItemRequest>();
            foreach (var pair in value.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = pair.Split(':');
                int id;
                int prefix;
                if (parts.Length != 2 || !int.TryParse(parts[0], out id) || !int.TryParse(parts[1], out prefix)
                    || id <= 0 || prefix <= 0 || prefix > 255)
                    throw new ArgumentException("Invalid item-prefix request: " + pair);
                if (requests.Count >= 512)
                    throw new ArgumentException("At most 512 item-prefix requests are allowed.");
                requests.Add(new ItemRequest(id, prefix));
            }
            return requests;
        }

        private static Assembly ResolveTerrariaDependency(object sender, ResolveEventArgs args)
        {
            var requested = new AssemblyName(args.Name).Name;
            var external = Path.Combine(_terrariaDirectory, requested + ".dll");
            if (File.Exists(external))
                return Assembly.LoadFrom(external);

            var resource = _terraria.GetManifestResourceNames().FirstOrDefault(name =>
                name.EndsWith("." + requested + ".dll", StringComparison.OrdinalIgnoreCase));
            if (resource == null)
                return null;

            using (var input = _terraria.GetManifestResourceStream(resource))
            using (var memory = new MemoryStream())
            {
                input.CopyTo(memory);
                return Assembly.Load(memory.ToArray());
            }
        }

        private static Dictionary<string, Dictionary<string, string>> ReadItemLocalization(Assembly assembly)
        {
            var merged = new Dictionary<string, Dictionary<string, string>>();
            foreach (var resourceName in new[]
            {
                "Terraria.Localization.Content.en-US.Items.json",
                "Terraria.Localization.Content.en-US.Game.json",
                "Terraria.Localization.Content.en-US.NPCs.json",
                "Terraria.Localization.Content.en-US.Legacy.json",
            })
            {
                using (var stream = assembly.GetManifestResourceStream(resourceName))
                using (var reader = new StreamReader(stream ?? throw new InvalidDataException(resourceName + " was not found in Terraria.exe.")))
                {
                    foreach (var section in ReadAllStringSections(reader.ReadToEnd()))
                        merged[section.Key] = section.Value;
                }
            }
            return merged;
        }

        private static Dictionary<string, Dictionary<string, string>> ReadAllStringSections(string json)
        {
            var result = new Dictionary<string, Dictionary<string, string>>();
            var index = 0;
            SkipWhitespace(json, ref index);
            Expect(json, ref index, '{');
            while (true)
            {
                SkipWhitespace(json, ref index);
                if (Take(json, ref index, '}'))
                    break;
                var section = ReadJsonString(json, ref index);
                SkipWhitespace(json, ref index);
                Expect(json, ref index, ':');
                SkipWhitespace(json, ref index);
                if (index < json.Length && json[index] == '{')
                    result[section] = ReadStringMap(json, ref index);
                else
                    SkipJsonValue(json, ref index);
                SkipWhitespace(json, ref index);
                if (!Take(json, ref index, ','))
                {
                    Expect(json, ref index, '}');
                    return result;
                }
            }
            return result;
        }

        private static Dictionary<string, string> ReadStringMap(string json, ref int index)
        {
            var result = new Dictionary<string, string>();
            Expect(json, ref index, '{');
            while (true)
            {
                SkipWhitespace(json, ref index);
                if (Take(json, ref index, '}'))
                    return result;
                var key = ReadJsonString(json, ref index);
                SkipWhitespace(json, ref index);
                Expect(json, ref index, ':');
                SkipWhitespace(json, ref index);
                if (index < json.Length && json[index] == '"')
                    result[key] = ReadJsonString(json, ref index);
                else
                    SkipJsonValue(json, ref index);
                SkipWhitespace(json, ref index);
                if (Take(json, ref index, ','))
                    continue;
                Expect(json, ref index, '}');
                return result;
            }
        }

        private static void SkipJsonValue(string json, ref int index)
        {
            SkipWhitespace(json, ref index);
            if (index >= json.Length)
                throw new InvalidDataException("Unexpected end of localization JSON.");
            if (json[index] == '"')
            {
                ReadJsonString(json, ref index);
                return;
            }
            if (json[index] == '{' || json[index] == '[')
            {
                var open = json[index++];
                var close = open == '{' ? '}' : ']';
                while (true)
                {
                    SkipWhitespace(json, ref index);
                    if (Take(json, ref index, close))
                        return;
                    SkipJsonValue(json, ref index);
                    SkipWhitespace(json, ref index);
                    if (Take(json, ref index, ':'))
                    {
                        SkipWhitespace(json, ref index);
                        SkipJsonValue(json, ref index);
                        SkipWhitespace(json, ref index);
                    }
                    if (Take(json, ref index, ','))
                        continue;
                    Expect(json, ref index, close);
                    return;
                }
            }
            while (index < json.Length && ",}] \t\r\n".IndexOf(json[index]) < 0)
                index++;
        }

        private static string ReadJsonString(string json, ref int index)
        {
            Expect(json, ref index, '"');
            var result = new StringBuilder();
            while (index < json.Length)
            {
                var character = json[index++];
                if (character == '"')
                    return result.ToString();
                if (character != '\\')
                {
                    result.Append(character);
                    continue;
                }
                if (index >= json.Length)
                    break;
                var escape = json[index++];
                switch (escape)
                {
                    case '"': result.Append('"'); break;
                    case '\\': result.Append('\\'); break;
                    case '/': result.Append('/'); break;
                    case 'b': result.Append('\b'); break;
                    case 'f': result.Append('\f'); break;
                    case 'n': result.Append('\n'); break;
                    case 'r': result.Append('\r'); break;
                    case 't': result.Append('\t'); break;
                    case 'u':
                        if (index + 4 > json.Length)
                            throw new InvalidDataException("Invalid unicode escape in localization JSON.");
                        result.Append((char)int.Parse(json.Substring(index, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                        index += 4;
                        break;
                    default: throw new InvalidDataException("Invalid escape in localization JSON.");
                }
            }
            throw new InvalidDataException("Unterminated string in localization JSON.");
        }

        private static void SkipWhitespace(string json, ref int index)
        {
            while (index < json.Length && char.IsWhiteSpace(json[index]))
                index++;
        }

        private static bool Take(string json, ref int index, char expected)
        {
            if (index >= json.Length || json[index] != expected)
                return false;
            index++;
            return true;
        }

        private static void Expect(string json, ref int index, char expected)
        {
            if (!Take(json, ref index, expected))
                throw new InvalidDataException("Expected '" + expected + "' in localization JSON at offset " + index + ".");
        }

        private static Dictionary<int, List<string>> ReadItemKeys(Type itemIdType)
        {
            var result = new Dictionary<int, List<string>>();
            foreach (var field in itemIdType.GetFields(BindingFlags.Public | BindingFlags.Static))
            {
                if ((field.FieldType != typeof(short) && field.FieldType != typeof(int)) || field.Name == "Count")
                    continue;
                int id;
                try { id = Convert.ToInt32(field.IsLiteral ? field.GetRawConstantValue() : field.GetValue(null), CultureInfo.InvariantCulture); }
                catch { continue; }
                if (id <= 0)
                    continue;
                List<string> keys;
                if (!result.TryGetValue(id, out keys))
                    result[id] = keys = new List<string>();
                keys.Add(field.Name);
            }
            return result;
        }

        private static int ReadItemCount(Type itemIdType, Dictionary<int, List<string>> keysById)
        {
            var count = itemIdType.GetField("Count", BindingFlags.Public | BindingFlags.Static);
            if (count != null)
            {
                try { return Convert.ToInt32(count.IsLiteral ? count.GetRawConstantValue() : count.GetValue(null), CultureInfo.InvariantCulture); }
                catch { }
            }
            return keysById.Count == 0 ? 1 : keysById.Keys.Max() + 1;
        }

        private static string SelectKey(
            Dictionary<int, List<string>> keysById,
            Dictionary<string, Dictionary<string, string>> localization,
            int id)
        {
            List<string> keys;
            if (!keysById.TryGetValue(id, out keys) || keys.Count == 0)
                return null;
            Dictionary<string, string> tooltips;
            localization.TryGetValue("ItemTooltip", out tooltips);
            return keys.FirstOrDefault(key => tooltips != null && tooltips.ContainsKey(key)) ?? keys[0];
        }

        private static void WriteItem(
            TextWriter writer,
            Type itemType,
            object item,
            int id,
            string key,
            Dictionary<string, Dictionary<string, string>> localization,
            PrefixDetails prefixDetails)
        {
            writer.Write("{\"id\":");
            writer.Write(id);
            WriteOptionalString(writer, "key", key);
            WriteLocalizedString(writer, "name", "ItemName", key, localization);
            WriteLocalizedString(writer, "tooltip", "ItemTooltip", key, localization);
            WriteNumber(writer, "damage", ReadInt(itemType, item, "damage"));
            WriteNumber(writer, "crit", ReadInt(itemType, item, "crit"));
            WriteFloat(writer, "knockBack", ReadFloat(itemType, item, "knockBack"));
            WriteNumber(writer, "useTime", ReadInt(itemType, item, "useTime"));
            WriteNumber(writer, "useAnimation", ReadInt(itemType, item, "useAnimation"));
            WriteNumber(writer, "mana", ReadInt(itemType, item, "mana"));
            WriteNumber(writer, "defense", ReadInt(itemType, item, "defense"));
            WriteNumber(writer, "pick", ReadInt(itemType, item, "pick"));
            WriteNumber(writer, "axe", ReadInt(itemType, item, "axe"));
            WriteNumber(writer, "hammer", ReadInt(itemType, item, "hammer"));
            WriteNumber(writer, "healLife", ReadInt(itemType, item, "healLife"));
            WriteNumber(writer, "healMana", ReadInt(itemType, item, "healMana"));
            WriteNumber(writer, "bait", ReadInt(itemType, item, "bait"));
            WriteNumber(writer, "fishingPole", ReadInt(itemType, item, "fishingPole"));
            WriteNumber(writer, "tileBoost", ReadInt(itemType, item, "tileBoost"));
            WriteNumber(writer, "useAmmo", ReadInt(itemType, item, "useAmmo"));
            WriteNumber(writer, "ammo", ReadInt(itemType, item, "ammo"));
            WriteNumber(writer, "buffType", ReadInt(itemType, item, "buffType"));
            WriteNumber(writer, "buffTime", ReadInt(itemType, item, "buffTime"));
            WriteNumber(writer, "mountType", ReadInt(itemType, item, "mountType"));
            WriteNumber(writer, "createTile", ReadInt(itemType, item, "createTile"));
            WriteNumber(writer, "createWall", ReadInt(itemType, item, "createWall"));
            WriteNumber(writer, "value", ReadInt(itemType, item, "value"));
            WriteNumber(writer, "rare", ReadInt(itemType, item, "rare"));
            WriteNumber(writer, "maxStack", ReadInt(itemType, item, "maxStack"));
            WriteNumber(writer, "prefix", ReadInt(itemType, item, "prefix"));
            WriteFloat(writer, "scale", ReadFloat(itemType, item, "scale"));
            WriteFloat(writer, "shootSpeed", ReadFloat(itemType, item, "shootSpeed"));
            WriteBoolean(writer, "melee", ReadBool(itemType, item, "melee"));
            WriteBoolean(writer, "ranged", ReadBool(itemType, item, "ranged"));
            WriteBoolean(writer, "magic", ReadBool(itemType, item, "magic"));
            WriteBoolean(writer, "summon", ReadBool(itemType, item, "summon"));
            WriteBoolean(writer, "accessory", ReadBool(itemType, item, "accessory"));
            WriteBoolean(writer, "consumable", ReadBool(itemType, item, "consumable"));
            WriteBoolean(writer, "material", ReadBool(itemType, item, "material"));
            WriteBoolean(writer, "autoReuse", ReadBool(itemType, item, "autoReuse"));
            WriteBoolean(writer, "channel", ReadBool(itemType, item, "channel"));
            if (prefixDetails != null)
            {
                WriteNumber(writer, "requestedPrefix", prefixDetails.RequestedPrefix);
                WriteRequiredBoolean(writer, "canRollPrefix", prefixDetails.CanRollPrefix);
                WriteRequiredBoolean(writer, "hasPrefixStats", prefixDetails.HasStats);
                WriteFloat(writer, "prefixDamageMultiplier", prefixDetails.Damage);
                WriteFloat(writer, "prefixKnockbackMultiplier", prefixDetails.Knockback);
                WriteFloat(writer, "prefixSpeedMultiplier", prefixDetails.Speed);
                WriteFloat(writer, "prefixScaleMultiplier", prefixDetails.Scale);
                WriteFloat(writer, "prefixVelocityMultiplier", prefixDetails.Velocity);
                WriteFloat(writer, "prefixManaMultiplier", prefixDetails.Mana);
                WriteNumber(writer, "prefixCritBonus", prefixDetails.Crit);
                WriteNumber(writer, "prefixTagDamageBonus", prefixDetails.TagDamage);
                WriteNumber(writer, "prefixArmorPenetrationBonus", prefixDetails.ArmorPenetration);
                WriteFloat(writer, "prefixValueMultiplier", prefixDetails.Value);
            }
            writer.Write('}');
        }

        private static PrefixDetails ReadPrefixDetails(
            Type itemType,
            object item,
            int requestedPrefix,
            MethodInfo canRollPrefix,
            MethodInfo prefixMultipliers)
        {
            var details = new PrefixDetails { RequestedPrefix = requestedPrefix };
            if (canRollPrefix != null)
            {
                try { details.CanRollPrefix = Convert.ToBoolean(canRollPrefix.Invoke(item, new object[] { requestedPrefix })); }
                catch { details.CanRollPrefix = false; }
            }
            if (prefixMultipliers == null)
                return details;

            var values = new object[] { requestedPrefix, 1f, 1f, 1f, 1f, 1f, 1f, 0, 0, 0, 1f };
            try
            {
                details.HasStats = Convert.ToBoolean(prefixMultipliers.Invoke(item, values));
                details.Damage = Convert.ToSingle(values[1], CultureInfo.InvariantCulture);
                details.Knockback = Convert.ToSingle(values[2], CultureInfo.InvariantCulture);
                details.Speed = Convert.ToSingle(values[3], CultureInfo.InvariantCulture);
                details.Scale = Convert.ToSingle(values[4], CultureInfo.InvariantCulture);
                details.Velocity = Convert.ToSingle(values[5], CultureInfo.InvariantCulture);
                details.Mana = Convert.ToSingle(values[6], CultureInfo.InvariantCulture);
                details.Crit = Convert.ToInt32(values[7], CultureInfo.InvariantCulture);
                details.TagDamage = Convert.ToInt32(values[8], CultureInfo.InvariantCulture);
                details.ArmorPenetration = Convert.ToInt32(values[9], CultureInfo.InvariantCulture);
                details.Value = Convert.ToSingle(values[10], CultureInfo.InvariantCulture);
            }
            catch
            {
                details.HasStats = false;
            }
            return details;
        }

        private const BindingFlags AllStatic = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static;
        private const BindingFlags AllInstance = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance;

        private static Type RequiredType(string name)
        {
            var type = _terraria.GetType(name);
            if (type == null)
                throw new TypeLoadException(name + " was not found in Terraria.exe.");
            return type;
        }

        private static int ReadInt(Type type, object instance, string name)
        {
            var field = type.GetField(name, AllInstance);
            return field == null ? 0 : Convert.ToInt32(field.GetValue(instance), CultureInfo.InvariantCulture);
        }

        private static float ReadFloat(Type type, object instance, string name)
        {
            var field = type.GetField(name, AllInstance);
            return field == null ? 0f : Convert.ToSingle(field.GetValue(instance), CultureInfo.InvariantCulture);
        }

        private static bool ReadBool(Type type, object instance, string name)
        {
            var field = type.GetField(name, AllInstance);
            return field != null && Convert.ToBoolean(field.GetValue(instance), CultureInfo.InvariantCulture);
        }

        private static void WriteLocalizedString(
            TextWriter writer,
            string outputName,
            string section,
            string key,
            Dictionary<string, Dictionary<string, string>> localization)
        {
            Dictionary<string, string> values;
            string value;
            if (key != null && localization.TryGetValue(section, out values) && values.TryGetValue(key, out value))
                WriteOptionalString(writer, outputName, ExpandReferences(value, localization, 0));
        }

        private static string ExpandReferences(
            string value,
            Dictionary<string, Dictionary<string, string>> localization,
            int depth)
        {
            if (depth >= 8 || string.IsNullOrEmpty(value))
                return value;
            value = Regex.Replace(value, @"\{\$([^.}]+)\.([^}]+)\}", match =>
            {
                Dictionary<string, string> section;
                string replacement;
                return localization.TryGetValue(match.Groups[1].Value, out section)
                    && section.TryGetValue(match.Groups[2].Value, out replacement)
                    ? ExpandReferences(replacement, localization, depth + 1)
                    : match.Value;
            });
            return Regex.Replace(value, @"\{InputTrigger_([^}]+)\}", match =>
            {
                var key = match.Groups[1].Value;
                if (key == "UseOrAttack") return "[Use / Attack]";
                if (key == "InteractWithTile") return "[Interact]";
                if (key == "ToggleOrOpen") return "[Open / Activate]";
                return "[" + Regex.Replace(key, "([a-z])([A-Z])", "$1 $2") + "]";
            });
        }

        private static void WriteOptionalString(TextWriter writer, string name, string value)
        {
            if (string.IsNullOrEmpty(value))
                return;
            writer.Write(',');
            WriteString(writer, name);
            writer.Write(':');
            WriteString(writer, value);
        }

        private static void WriteNumber(TextWriter writer, string name, int value)
        {
            if (value == 0)
                return;
            writer.Write(",\"");
            writer.Write(name);
            writer.Write("\":");
            writer.Write(value.ToString(CultureInfo.InvariantCulture));
        }

        private static void WriteFloat(TextWriter writer, string name, float value)
        {
            if (Math.Abs(value) < 0.0001f)
                return;
            writer.Write(",\"");
            writer.Write(name);
            writer.Write("\":");
            writer.Write(value.ToString("0.####", CultureInfo.InvariantCulture));
        }

        private static void WriteBoolean(TextWriter writer, string name, bool value)
        {
            if (!value)
                return;
            writer.Write(",\"");
            writer.Write(name);
            writer.Write("\":true");
        }

        private static void WriteRequiredBoolean(TextWriter writer, string name, bool value)
        {
            writer.Write(",\"");
            writer.Write(name);
            writer.Write("\":");
            writer.Write(value ? "true" : "false");
        }

        private static void WriteString(TextWriter writer, string value)
        {
            writer.Write('"');
            foreach (var character in value)
            {
                switch (character)
                {
                    case '"': writer.Write("\\\""); break;
                    case '\\': writer.Write("\\\\"); break;
                    case '\b': writer.Write("\\b"); break;
                    case '\f': writer.Write("\\f"); break;
                    case '\n': writer.Write("\\n"); break;
                    case '\r': writer.Write("\\r"); break;
                    case '\t': writer.Write("\\t"); break;
                    default:
                        if (character < 32)
                            writer.Write("\\u" + ((int)character).ToString("x4"));
                        else
                            writer.Write(character);
                        break;
                }
            }
            writer.Write('"');
        }

        private sealed class ItemRequest
        {
            public ItemRequest(int id, int prefix)
            {
                Id = id;
                Prefix = prefix;
            }

            public int Id { get; private set; }
            public int Prefix { get; private set; }
        }

        private sealed class PrefixDetails
        {
            public int RequestedPrefix { get; set; }
            public bool CanRollPrefix { get; set; }
            public bool HasStats { get; set; }
            public float Damage { get; set; } = 1f;
            public float Knockback { get; set; } = 1f;
            public float Speed { get; set; } = 1f;
            public float Scale { get; set; } = 1f;
            public float Velocity { get; set; } = 1f;
            public float Mana { get; set; } = 1f;
            public int Crit { get; set; }
            public int TagDamage { get; set; }
            public int ArmorPenetration { get; set; }
            public float Value { get; set; } = 1f;
        }
    }
}
