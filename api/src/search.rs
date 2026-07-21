/// Escapes the LIKE/ILIKE wildcards in a free-text needle so user input is matched
/// literally. Postgres treats `%` and `_` as wildcards and `\` as the default escape
/// character, so a bound needle of `50%` would otherwise match far more than intended.
#[must_use]
pub fn escape_like(needle: &str) -> String {
    let mut escaped = String::with_capacity(needle.len());

    for ch in needle.chars() {
        match ch {
            '\\' => escaped.push_str("\\\\"),
            '%' => escaped.push_str("\\%"),
            '_' => escaped.push_str("\\_"),
            other => escaped.push(other),
        }
    }

    escaped
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escape_like_escapes_every_wildcard_and_the_escape_char() {
        assert_eq!(escape_like("50%"), "50\\%");
        assert_eq!(escape_like("a_b"), "a\\_b");
        assert_eq!(escape_like("back\\slash"), "back\\\\slash");
        assert_eq!(escape_like("100%_\\"), "100\\%\\_\\\\");
    }

    #[test]
    fn escape_like_leaves_plain_text_untouched() {
        assert_eq!(escape_like("overload"), "overload");
        assert_eq!(escape_like(""), "");
    }
}
